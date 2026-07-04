/*
 * Hero constellation — procedural connection layer.
 *
 * The ONE cube (page-level #cube-stage, fixed at the viewport centre) is the core
 * of a living interface. This script draws the energy links that tie each real
 * glass UI node to that core and keeps them glued to the cube as the hero scrolls.
 *
 * It is NOT a renderer and touches neither the Cube Engine nor the Motion Engine:
 * it only writes SVG path geometry + a little live data into the DOM. The energy
 * flow and node reactions are pure CSS (base.css), synchronised by animation-delay.
 * Under prefers-reduced-motion the links hold still and no live data ticks.
 */
(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    var hero = document.getElementById('hero');
    var svg = document.getElementById('hero-links');
    if (!hero || !svg) return;

    var nodes = Array.prototype.slice.call(hero.querySelectorAll('[data-node]'));
    if (nodes.length === 0) return;

    // One base link + one travelling-pulse path per node (created once). pathLength
    // is normalised to 100 so the CSS dash animation is identical for every length.
    var links = nodes.map(function (node) {
      var base = document.createElementNS(SVG_NS, 'path');
      base.setAttribute('class', 'hero-link');
      base.setAttribute('pathLength', '100');
      var pulse = document.createElementNS(SVG_NS, 'path');
      pulse.setAttribute('class', 'hero-link-pulse');
      pulse.setAttribute('pathLength', '100');
      var delay = (getComputedStyle(node).getPropertyValue('--delay') || '0s').trim();
      pulse.style.setProperty('--delay', delay || '0s');
      svg.appendChild(base);
      svg.appendChild(pulse);
      return { node: node, base: base, pulse: pulse };
    });

    function geometry() {
      var hr = hero.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + hr.width + ' ' + hr.height);
      // Core = the cube's screen centre. The cube canvas is fixed and its camera
      // looks at the origin, so the core sits at the viewport centre — expressed
      // here in hero-local coordinates (tracks the fixed cube as the hero scrolls).
      var coreX = window.innerWidth / 2 - hr.left;
      var coreY = window.innerHeight / 2 - hr.top;

      for (var i = 0; i < links.length; i++) {
        var r = links[i].node.getBoundingClientRect();
        var cx = r.left + r.width / 2 - hr.left;
        var cy = r.top + r.height / 2 - hr.top;
        var dx = coreX - cx;
        var dy = coreY - cy;
        // Anchor on the card's perimeter, on the side facing the core.
        var s = Math.min(r.width / 2 / (Math.abs(dx) || 1), r.height / 2 / (Math.abs(dy) || 1));
        var ax = cx + dx * s;
        var ay = cy + dy * s;
        // Gentle perpendicular bow so links read as organic neural threads.
        var vx = ax - coreX;
        var vy = ay - coreY;
        var len = Math.hypot(vx, vy) || 1;
        var bow = Math.min(len * 0.16, 46);
        var mx = (coreX + ax) / 2 + (-vy / len) * bow;
        var my = (coreY + ay) / 2 + (vx / len) * bow;
        var d =
          'M ' + coreX.toFixed(1) + ' ' + coreY.toFixed(1) +
          ' Q ' + mx.toFixed(1) + ' ' + my.toFixed(1) +
          ' ' + ax.toFixed(1) + ' ' + ay.toFixed(1);
        links[i].base.setAttribute('d', d);
        links[i].pulse.setAttribute('d', d);
      }
    }

    // Keep links glued to the fixed cube while the hero is on-screen; pause the
    // pulse animation and stop recomputing once it scrolls away (perf).
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

    // Live data — the interface is never static. Skipped under reduced motion.
    if (!REDUCED_MOTION) {
      hero.querySelectorAll('.hero-count').forEach(function (el) {
        var from = parseFloat(el.getAttribute('data-from'));
        var to = parseFloat(el.getAttribute('data-to'));
        if (isNaN(from) || isNaN(to)) return;
        var suffix = el.getAttribute('data-suffix') || '';
        var lo = Math.min(from, to);
        var hi = Math.max(from, to);
        var step = Math.max(1, Math.round((hi - lo) / 14));
        var cur = from;
        var dir = to >= from ? 1 : -1;
        setInterval(function () {
          cur += dir * (1 + Math.floor(Math.random() * step));
          if (cur >= hi) { cur = hi; dir = -1; }
          if (cur <= lo) { cur = lo; dir = 1; }
          el.textContent = Math.round(cur) + suffix;
        }, 1600);
      });

      var ai = hero.querySelector('[data-ai-status]');
      if (ai) {
        var states = ['обрабатывает запрос…', 'анализирует данные…', 'готовит ответ…', 'решение принято ✓'];
        var idx = 0;
        setInterval(function () {
          idx = (idx + 1) % states.length;
          ai.textContent = states[idx];
        }, 2400);
      }
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
