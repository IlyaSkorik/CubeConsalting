/*
 * Hero constellation — the living operating system around the cube.
 *
 * The ONE cube (page-level #cube-stage, fixed at the viewport centre) is the
 * intelligent core. Every surrounding module plugs into a DISTINCT port on the
 * cube's silhouette; energy flows cube → module along elegant bezier links and the
 * module reacts as each pulse arrives. Depth comes from per-module scale/opacity,
 * gentle floating and subtle pointer parallax.
 *
 * This is NOT a renderer and touches neither the Cube Engine nor the Motion Engine:
 * it writes SVG path geometry, a few CSS variables and small live-data updates. The
 * energy flow, glow and float are pure CSS (base.css); this file owns the timing so
 * the flow and the data reactions stay in sync. Under prefers-reduced-motion the
 * links hold still, nothing ticks, and modules rest on their depth layer.
 */
(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Each module docks at a DISTINCT port on the cube's silhouette (a direction from
  // the cube centre) — no two share an origin, so the cube reads as a hub with real
  // ports on different faces/edges/corners. `w` varies link width; `delay`/`dur`
  // are per-link (desynced) so the network breathes organically rather than in step.
  var CONFIG = {
    telegram:  { dir: [-1.0, -0.30], w: 1.7,  delay: 0.0,  dur: 3.1 }, // left face, upper
    crm:       { dir: [-0.95, 0.45], w: 1.35, delay: 1.3,  dur: 3.7 }, // left face, lower
    tasks:     { dir: [-0.45, 1.0],  w: 1.2,  delay: 2.4,  dur: 2.8 }, // bottom-left corner
    analytics: { dir: [1.0, -0.32],  w: 1.55, delay: 0.7,  dur: 3.4 }, // right face, upper
    ai:        { dir: [0.95, 0.42],  w: 1.75, delay: 1.9,  dur: 2.6 }, // right face, lower
    api:       { dir: [0.5, 1.0],    w: 1.3,  delay: 0.35, dur: 3.9 }, // bottom-right corner
  };
  // Cube on-screen half-extent (px) as a share of the smaller viewport dimension —
  // ports sit on this ring so links visibly originate from the cube's sides. Tune
  // to match the rendered cube (which the hero beat keeps compact).
  var CUBE_RADIUS_RATIO = 0.17;
  var AI_STATES = ['обрабатывает запрос…', 'анализирует данные…', 'готовит ответ…', 'решение принято ✓'];

  var timers = [];

  function init() {
    var hero = document.getElementById('hero');
    var svg = document.getElementById('hero-links');
    if (!hero || !svg) return;

    buildParticles();

    var nodes = Array.prototype.slice.call(hero.querySelectorAll('[data-node]'));
    if (nodes.length === 0) return;

    // One base link + one travelling-pulse path per node. pathLength=100 normalises
    // the dash animation across every link length; per-node timing is set here.
    var links = nodes.map(function (node) {
      var id = node.getAttribute('data-node');
      var cfg = CONFIG[id] || { dir: [0, 1], w: 1.4, delay: 0, dur: 3 };
      var nd = Math.hypot(cfg.dir[0], cfg.dir[1]) || 1;

      node.style.setProperty('--delay', cfg.delay + 's');
      node.style.setProperty('--flow-dur', cfg.dur + 's');

      var base = document.createElementNS(SVG_NS, 'path');
      base.setAttribute('class', 'hero-link');
      base.setAttribute('pathLength', '100');
      base.style.strokeWidth = cfg.w.toFixed(2);

      var pulse = document.createElementNS(SVG_NS, 'path');
      pulse.setAttribute('class', 'hero-link-pulse');
      pulse.setAttribute('pathLength', '100');
      pulse.style.strokeWidth = (cfg.w + 1.0).toFixed(2);
      pulse.style.setProperty('--delay', cfg.delay + 's');
      pulse.style.setProperty('--flow-dur', cfg.dur + 's');

      svg.appendChild(base);
      svg.appendChild(pulse);

      // Fire the module's reaction as the pulse ARRIVES (≈80% of the flow, matching
      // the CSS arrival glow), then repeat once per flow cycle.
      if (!REDUCED_MOTION && REACT[id]) {
        var arriveMs = (cfg.delay + cfg.dur * 0.8) * 1000;
        var t = window.setTimeout(function () {
          REACT[id](node);
          timers.push(window.setInterval(function () { REACT[id](node); }, cfg.dur * 1000));
        }, arriveMs);
        timers.push(t);
      }

      return { id: id, node: node, base: base, pulse: pulse, ux: cfg.dir[0] / nd, uy: cfg.dir[1] / nd };
    });

    function geometry() {
      var hr = hero.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + hr.width + ' ' + hr.height);
      // Cube centre = its screen centre (the canvas is fixed, its camera looks at the
      // origin), expressed in hero-local coords so links track the cube as it scrolls.
      // Prefer the LIVE cube ports projected by landing.ts — real points on the cube
      // surface that follow its transform. Fall back to a silhouette ring only if the
      // cube is unavailable (no WebGL) so the page still connects.
      var pub = window.__cubePorts;
      var live = !!(pub && pub.ready && pub.ports);
      var ccx, ccy, radius;
      if (live) {
        ccx = pub.cx - hr.left;
        ccy = pub.cy - hr.top;
      } else {
        ccx = window.innerWidth / 2 - hr.left;
        ccy = window.innerHeight / 2 - hr.top;
        radius = Math.min(window.innerWidth, window.innerHeight) * CUBE_RADIUS_RATIO;
      }

      for (var i = 0; i < links.length; i++) {
        var l = links[i];
        var r = l.node.getBoundingClientRect();
        var cx = r.left + r.width / 2 - hr.left;
        var cy = r.top + r.height / 2 - hr.top;

        // P0 = the port ON the cube surface; I0 = a point INSIDE the cube (pulse origin).
        var px, py, ix, iy;
        if (live && pub.ports[l.id]) {
          px = pub.ports[l.id].x - hr.left;
          py = pub.ports[l.id].y - hr.top;
          var intr = pub.interior[l.id] || pub.ports[l.id];
          ix = intr.x - hr.left;
          iy = intr.y - hr.top;
        } else {
          px = ccx + l.ux * radius;
          py = ccy + l.uy * radius;
          ix = ccx + l.ux * radius * 0.4;
          iy = ccy + l.uy * radius * 0.4;
        }

        // Anchor on the card perimeter, on the side facing the port.
        var dx = px - cx;
        var dy = py - cy;
        var s = Math.min(r.width / 2 / (Math.abs(dx) || 1), r.height / 2 / (Math.abs(dy) || 1));
        var ax = cx + dx * s;
        var ay = cy + dy * s;

        // Outward normal in screen space (cube centre -> port): the link leaves the
        // surface along it, so it reads as physically plugged into the cube face.
        var ox = px - ccx;
        var oy = py - ccy;
        var ol = Math.hypot(ox, oy) || 1;
        var nx = ox / ol;
        var ny = oy / ol;

        // Cubic bezier from port to module — elegant routing, no harsh angles.
        var dist = Math.hypot(ax - px, ay - py) || 1;
        var stx = (ax - px) / dist;
        var sty = (ay - py) / dist;
        var c1x = px + nx * dist * 0.5;
        var c1y = py + ny * dist * 0.5;
        var c2x = ax - stx * dist * 0.32;
        var c2y = ay - sty * dist * 0.32;
        var curve =
          ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) +
          ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) +
          ' ' + ax.toFixed(1) + ' ' + ay.toFixed(1);

        // Base link: first visible pixels emerge AT the surface port.
        l.base.setAttribute('d', 'M ' + px.toFixed(1) + ' ' + py.toFixed(1) + curve);
        // Pulse: begins INSIDE the cube, exits through the port, then travels on — so
        // the energy visibly originates from the cube that powers the module.
        l.pulse.setAttribute('d', 'M ' + ix.toFixed(1) + ' ' + iy.toFixed(1) + ' L ' + px.toFixed(1) + ' ' + py.toFixed(1) + curve);
      }
    }

    // Keep links glued to the fixed cube while the hero is on-screen; pause the flow
    // and stop recomputing once it scrolls away (perf).
    var running = false;
    function loop() {
      if (!running) return;
      geometry();
      requestAnimationFrame(loop);
    }
    var io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var visible = entries[i].isIntersecting;
          svg.classList.toggle('is-paused', !visible);
          if (visible && !running) {
            running = true;
            requestAnimationFrame(loop);
          } else if (!visible) {
            running = false;
          }
        }
      },
      { threshold: 0 },
    );
    io.observe(hero);
    geometry();
    window.addEventListener('resize', geometry, { passive: true });

    // Subtle pointer parallax — modules on nearer depth layers (--pf) shift more.
    if (!REDUCED_MOTION) {
      var stage = hero.querySelector('.hero-constellation') || hero;
      hero.addEventListener(
        'mousemove',
        function (e) {
          var nx = e.clientX / window.innerWidth - 0.5;
          var ny = e.clientY / window.innerHeight - 0.5;
          stage.style.setProperty('--px', (-nx * 14).toFixed(1) + 'px');
          stage.style.setProperty('--py', (-ny * 10).toFixed(1) + 'px');
        },
        { passive: true },
      );
      hero.addEventListener('mouseleave', function () {
        stage.style.setProperty('--px', '0px');
        stage.style.setProperty('--py', '0px');
      });
    }

    window.addEventListener(
      'pagehide',
      function () {
        io.disconnect();
        window.removeEventListener('resize', geometry);
        for (var i = 0; i < timers.length; i++) window.clearTimeout(timers[i]), window.clearInterval(timers[i]);
      },
      { once: true },
    );
  }

  // --- Module reactions (extremely subtle, fired as a pulse arrives) --------------
  var REACT = {
    telegram: function (node) { blink(node.querySelector('.status-dot'), 'react-blink'); },
    crm: function (node) { stepCounter(node.querySelector('.hero-count'), 1); },
    analytics: function (node) { updateGraph(node); },
    ai: function (node) { cycleStatus(node.querySelector('[data-ai-status]')); },
    api: function (node) {
      blink(node.querySelector('.status-dot'), 'react-flash');
      stepCounter(node.querySelector('.hero-count'), -1);
    },
    tasks: function (node) {
      var c = node.querySelector('.hero-count');
      stepCounter(c, 1);
      var fill = node.querySelector('.hero-progress__fill');
      if (c && fill && c._cur != null) fill.style.width = c._cur + '%';
    },
  };

  function blink(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart the one-shot animation
    el.classList.add(cls);
    window.setTimeout(function () { el.classList.remove(cls); }, 650);
  }

  function stepCounter(el, sign) {
    if (!el) return;
    var from = parseFloat(el.getAttribute('data-from'));
    var to = parseFloat(el.getAttribute('data-to'));
    if (isNaN(from) || isNaN(to)) return;
    var suffix = el.getAttribute('data-suffix') || '';
    var lo = Math.min(from, to);
    var hi = Math.max(from, to);
    var span = Math.max(1, Math.round((hi - lo) / 12));
    var cur = el._cur == null ? from : el._cur;
    cur += sign * (1 + Math.floor(Math.random() * span));
    if (cur > hi) cur = lo;      // wrap so it keeps living
    if (cur < lo) cur = hi;
    el._cur = cur;
    el.textContent = cur + suffix;
  }

  function updateGraph(node) {
    var bars = node.querySelectorAll('.hero-graph span');
    for (var i = 0; i < bars.length; i++) {
      bars[i].style.setProperty('--h', (0.35 + Math.random() * 0.6).toFixed(2));
    }
  }

  function cycleStatus(el) {
    if (!el) return;
    el._i = ((el._i == null ? 0 : el._i) + 1) % AI_STATES.length;
    el.textContent = AI_STATES[el._i];
  }

  function buildParticles() {
    var host = document.getElementById('hero-particles');
    if (!host || host.childElementCount > 0) return;
    // Deterministic-ish scatter (no reliance on layout) — tiny blue energy motes.
    var COUNT = 16;
    for (var i = 0; i < COUNT; i++) {
      var p = document.createElement('i');
      var x = (7 + (i * 61) % 86);          // spread across width
      var y = (10 + (i * 37) % 80);         // spread across height
      var size = 2 + (i % 3);
      var dur = 7 + (i % 5) * 1.3;
      var delay = -(i * 0.9);
      p.style.cssText =
        '--x:' + x + '%;--y:' + y + '%;--s:' + size + 'px;--pd:' + dur + 's;--pdelay:' + delay + 's;';
      host.appendChild(p);
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
