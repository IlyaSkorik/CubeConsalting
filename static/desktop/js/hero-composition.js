/*
 * Hero constellation — the DOM side of the living operating system.
 *
 * The connection cables are REAL 3D objects in the Three.js scene, built and animated
 * by landing.ts (they leave the cube's ports in world space and fade toward these
 * cards). This file owns only the DOM: the atmosphere particles, subtle pointer
 * parallax, and each module's reaction. Reactions fire on the `hero-pulse` event that
 * landing.ts dispatches when a 3D energy pulse reaches a module — so the card lights
 * and updates exactly as the energy arrives. No SVG cables, no screen-space overlay.
 *
 * Under prefers-reduced-motion the cube emits no pulses, so nothing here ticks.
 */
(function () {
  var REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AI_STATES = ['обрабатывает запрос…', 'анализирует данные…', 'готовит ответ…', 'решение принято ✓'];

  function init() {
    var hero = document.getElementById('hero');
    if (!hero) return;

    buildParticles();

    var nodesById = {};
    var nodes = hero.querySelectorAll('[data-node]');
    for (var i = 0; i < nodes.length; i++) nodesById[nodes[i].getAttribute('data-node')] = nodes[i];

    // A 3D energy pulse reached a module: light the card and run its micro-update,
    // perfectly in sync with the cable's pulse (landing.ts owns the timing).
    window.addEventListener('hero-pulse', function (e) {
      var id = e.detail && e.detail.id;
      var node = id && nodesById[id];
      if (!node) return;
      node.classList.add('is-lit');
      window.setTimeout(function () { node.classList.remove('is-lit'); }, 700);
      if (REACT[id]) REACT[id](node);
    });

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
    if (cur > hi) cur = lo; // wrap so it keeps living
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
    var COUNT = 16;
    for (var i = 0; i < COUNT; i++) {
      var p = document.createElement('i');
      var x = 7 + ((i * 61) % 86);
      var y = 10 + ((i * 37) % 80);
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
