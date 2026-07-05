/*
 * Solutions — the cube exposes the platform's architecture.
 *
 * This is NOT a transition effect. Nothing expands, bursts or radiates. As the
 * section leads the viewport the cube activates ONE port; a single connection
 * grows out of it (the bus). When that connection lands, the network branches
 * node → node → node in construction waves — a spanning tree, not a radial star —
 * and every card is CONSTRUCTED (wiped in from the side its connection arrives on)
 * the instant its edge reaches it. processor → bus → network → system.
 *
 * The first connection originates from the cube's real screen port (published by
 * landing.ts as `window.__cubeScreen`) and tracks the cube as it sways; the rest of
 * the topology is anchored to the DOM — the cube generated the structure, and the
 * structure now stands on its own. Topology/DOM only: no engine, no renderer.
 * Under prefers-reduced-motion nothing grows; the architecture is simply present.
 */
(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GROW_MS = 560; // time for one connection to grow end-to-end
  var FIRST_HOLD_MS = 300; // the single port→node "bus" beat holds before the network branches
  var SETTLE_MS = 90; // a child connection departs shortly after its parent node is built
  var SIBLING_MS = 220; // connections sharing a parent fan out staggered (they form together)

  function easeInOut(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  function ns(tag) {
    return document.createElementNS(SVG_NS, tag);
  }

  function init() {
    var section = document.getElementById('solutions');
    var svg = document.getElementById('solutions-net');
    if (!section || !svg) return;

    var cards = Array.prototype.slice.call(section.querySelectorAll('.sol-card'));
    if (cards.length === 0) return;
    // Construction order is authored via data-net (the sequence the platform builds in).
    cards.sort(function (a, b) {
      return (+a.getAttribute('data-net') || 0) - (+b.getAttribute('data-net') || 0);
    });

    if (REDUCED_MOTION) {
      // No construction motion — present the built architecture.
      for (var r = 0; r < cards.length; r++) cards[r].classList.add('is-built');
      return;
    }

    var links = cards.map(function (card) {
      var path = ns('path');
      path.setAttribute('class', 'sol-link');
      path.setAttribute('pathLength', '100');
      var node = ns('circle');
      node.setAttribute('class', 'sol-node');
      node.setAttribute('r', '3');
      node.style.opacity = '0';
      svg.appendChild(path);
      svg.appendChild(node);
      return {
        card: card,
        path: path,
        node: node,
        parent: -1, // index of the card this connection grows FROM (-1 = the cube port)
        depGap: 0, // ms to wait after the parent node is built before departing
        start: -1, // wall-clock departure time (set by the scheduler)
        builtAt: -1, // wall-clock time this node was constructed
        grown: 0,
        built: false,
      };
    });
    // The active port — a single lit node on the cube where energy exits (not a ring).
    var origin = ns('circle');
    origin.setAttribute('class', 'sol-origin');
    origin.setAttribute('r', '5');
    svg.appendChild(origin);

    var phase = 'idle'; // idle | building
    var running = false;
    var originBuiltAt = -1; // the port is "built" (active) the moment the sequence begins

    // --- port position (section-local); tracks the real cube when available -----
    function portPoint(sr) {
      var pub = window.__cubeScreen;
      if (pub && pub.ready) return { x: pub.x - sr.left, y: pub.y - sr.top };
      return { x: sr.width * 0.5, y: sr.height * 0.4 };
    }
    // centre of a card in section-local coords
    function centre(card, sr) {
      var r = card.getBoundingClientRect();
      return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top, r: r };
    }
    // point on a rect's perimeter on the side facing (tx,ty)
    function edgeToward(c, tx, ty) {
      var dx = tx - c.x;
      var dy = ty - c.y;
      var s = Math.min(c.r.width / 2 / (Math.abs(dx) || 1), c.r.height / 2 / (Math.abs(dy) || 1));
      return { x: c.x + dx * s, y: c.y + dy * s };
    }

    // Build the topology once: a nearest-insertion spanning tree rooted at the port.
    // The first card connects to the port; each later card connects to whichever
    // already-reachable node is closest — so the network genuinely GROWS outward
    // through itself rather than spraying spokes from the centre.
    function buildTopology(sr) {
      var port = portPoint(sr);
      var reachable = [{ x: port.x, y: port.y, idx: -1 }];
      var childCount = {}; // parent idx (as string) -> how many children scheduled so far
      for (var i = 0; i < links.length; i++) {
        var c = centre(cards[i], sr);
        var parent = -1;
        if (i !== 0) {
          var best = Infinity;
          for (var k = 0; k < reachable.length; k++) {
            var d = Math.hypot(reachable[k].x - c.x, reachable[k].y - c.y);
            if (d < best) {
              best = d;
              parent = reachable[k].idx;
            }
          }
        }
        links[i].parent = parent;

        var key = String(parent);
        var order = childCount[key] || 0;
        childCount[key] = order + 1;
        // Departure gap after the parent node lands:
        //  - the very first connection leaves the port immediately (order 0 of the port),
        //  - further port connections wait out the "bus" beat, then fan out,
        //  - connections off an interior node depart just after it is built.
        if (parent === -1) links[i].depGap = order === 0 ? 0 : FIRST_HOLD_MS + order * SIBLING_MS;
        else links[i].depGap = SETTLE_MS + order * SIBLING_MS;

        // Card is wiped in from the side its connection arrives on.
        var anchor = parent === -1 ? port : centre(cards[parent], sr);
        links[i].card.setAttribute('data-build', anchor.x <= c.x ? 'ltr' : 'rtl');

        reachable.push({ x: c.x, y: c.y, idx: i });
      }
    }

    function reset() {
      phase = 'idle';
      originBuiltAt = -1;
      svg.classList.remove('is-active');
      for (var i = 0; i < links.length; i++) {
        links[i].start = -1;
        links[i].builtAt = -1;
        links[i].grown = 0;
        links[i].built = false;
        links[i].card.classList.remove('is-built');
        links[i].node.style.opacity = '0';
        links[i].path.style.strokeDashoffset = '100';
      }
    }

    function beginSequence(now) {
      phase = 'building';
      svg.classList.add('is-active');
      buildTopology(section.getBoundingClientRect());
      originBuiltAt = now; // the port activates first — energy is ready to exit
    }

    // Event-driven scheduler: a connection may only depart once its parent node has
    // been constructed (plus its gap). This produces waves — port → node, then that
    // node's branches, then theirs — instead of everything firing at once.
    function schedule(now) {
      for (var i = 0; i < links.length; i++) {
        var l = links[i];
        if (l.start >= 0) continue;
        var parentBuiltAt = l.parent < 0 ? originBuiltAt : links[l.parent].builtAt;
        if (parentBuiltAt < 0) continue;
        if (now - parentBuiltAt >= l.depGap) l.start = now;
      }
    }

    function geometry(now) {
      var sr = section.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + sr.width + ' ' + sr.height);
      var port = portPoint(sr);
      origin.setAttribute('cx', port.x.toFixed(1));
      origin.setAttribute('cy', port.y.toFixed(1));

      for (var i = 0; i < links.length; i++) {
        var l = links[i];
        var child = centre(l.card, sr);
        // where the connection grows FROM: the port, or the parent card's near edge.
        var from;
        if (l.parent < 0) {
          from = { x: port.x, y: port.y };
        } else {
          var p = centre(cards[l.parent], sr);
          from = edgeToward(p, child.x, child.y);
        }
        var to = edgeToward(child, from.x, from.y);

        if (phase === 'building' && l.start >= 0) {
          l.grown = Math.max(0, Math.min(1, (now - l.start) / GROW_MS));
        }
        var g = easeInOut(l.grown);

        // gently bowed connector (a routed trace, not a straight radial spoke)
        var mx = (from.x + to.x) / 2;
        var my = (from.y + to.y) / 2;
        var nx = -(to.y - from.y);
        var ny = to.x - from.x;
        var nl = Math.hypot(nx, ny) || 1;
        var bow = Math.min(Math.hypot(to.x - from.x, to.y - from.y) * 0.14, 54);
        var cx = mx + (nx / nl) * bow;
        var cy = my + (ny / nl) * bow;
        l.path.setAttribute(
          'd',
          'M ' + from.x.toFixed(1) + ' ' + from.y.toFixed(1) +
            ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + to.x.toFixed(1) + ' ' + to.y.toFixed(1),
        );
        l.path.style.strokeDashoffset = (100 * (1 - g)).toFixed(2);

        // a bright node rides the growing tip (quadratic bezier at t = g)
        var it = 1 - g;
        var tipx = it * it * from.x + 2 * it * g * cx + g * g * to.x;
        var tipy = it * it * from.y + 2 * it * g * cy + g * g * to.y;
        l.node.setAttribute('cx', tipx.toFixed(1));
        l.node.setAttribute('cy', tipy.toFixed(1));
        l.node.style.opacity = l.start >= 0 && g > 0.02 && g < 0.985 ? '1' : '0';

        // construct the card the instant its connection lands → it becomes a parent
        if (!l.built && g >= 0.985) {
          l.built = true;
          l.builtAt = now;
          l.card.classList.add('is-built');
        }
      }
    }

    function loop(now) {
      if (!running) return;
      if (phase === 'building') schedule(now);
      geometry(now);
      requestAnimationFrame(loop);
    }

    var io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            if (!running) {
              running = true;
              requestAnimationFrame(loop);
            }
            if (phase === 'idle') requestAnimationFrame(beginSequence);
          } else {
            running = false;
            reset();
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(section);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
