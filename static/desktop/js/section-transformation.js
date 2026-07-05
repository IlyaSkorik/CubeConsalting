/*
 * Solutions — Platform Reveal.
 * Driven by SceneDirector — starts when solutions scene becomes active.
 */
(function () {
  var REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var INTRO_HOLD = 0.7;
  var MORPH_DURATION = 1.75;
  var HOLD_AT_PEAK = 0.55;
  var FORM_COUNT = 4;
  var SEGMENT = MORPH_DURATION + HOLD_AT_PEAK;

  function activeForm(t) {
    if (t < INTRO_HOLD) return -1;
    var elapsed = t - INTRO_HOLD;
    return Math.min(FORM_COUNT - 1, Math.floor(elapsed / SEGMENT));
  }

  function shellProgress(t, index) {
    if (t < INTRO_HOLD) return 0;
    var elapsed = t - INTRO_HOLD;
    var t0 = index * SEGMENT;
    if (elapsed < t0) return 0;
    var local = elapsed - t0;
    if (local < MORPH_DURATION * 0.3) return 0;
    if (local < MORPH_DURATION) {
      return (local - MORPH_DURATION * 0.3) / (MORPH_DURATION * 0.7);
    }
    return 1;
  }

  function easeOut(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function init() {
    var section = document.getElementById('solutions');
    if (!section) return;

    var shells = Array.prototype.slice.call(section.querySelectorAll('.sol-shell'));
    if (shells.length === 0) return;
    shells.sort(function (a, b) {
      return (+a.getAttribute('data-form') || 0) - (+b.getAttribute('data-form') || 0);
    });

    if (REDUCED_MOTION) {
      section.classList.add('is-complete');
      for (var r = 0; r < shells.length; r++) {
        shells[r].classList.add('is-manifest');
        shells[r].style.setProperty('--emerge', '1');
      }
      return;
    }

    var running = false;
    var localT = 0;
    var lastNow = 0;
    var rafId = 0;

    function tick(now) {
      var pub = window.__cubeTransform;
      if (pub && pub.ready) localT = pub.t;
      else localT += Math.min(0.04, (now - lastNow) / 1000);
      lastNow = now;

      var current = activeForm(localT);
      var done = localT >= INTRO_HOLD + FORM_COUNT * SEGMENT;
      section.classList.toggle('is-revealing', !done && localT > 0);
      section.classList.toggle('is-complete', done);

      for (var i = 0; i < shells.length; i++) {
        var shell = shells[i];
        var raw = shellProgress(localT, i);
        var p = easeOut(raw);
        shell.style.setProperty('--emerge', p.toFixed(3));
        shell.classList.toggle('is-manifest', p >= 1 || i < current);
        shell.classList.toggle('is-emerging', i === current && p > 0 && p < 1);
        shell.classList.toggle('is-active', p >= 1 || (i === current && p >= 0.55));
      }
    }

    function reset() {
      localT = 0;
      lastNow = 0;
      section.classList.remove('is-revealing', 'is-complete');
      for (var i = 0; i < shells.length; i++) {
        shells[i].classList.remove('is-manifest', 'is-emerging', 'is-active');
        shells[i].style.removeProperty('--emerge');
      }
    }

    function loop(now) {
      if (!running) return;
      tick(now);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      lastNow = performance.now();
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      reset();
    }

    document.addEventListener('cub:scene-active', function (e) {
      if (e.detail && e.detail.id === 'solutions') start();
    });

    document.addEventListener('cub:scene-leaving', function (e) {
      if (e.detail && e.detail.id === 'solutions') stop();
    });

    /* If solutions is already active on load (deep link). */
    if (section.dataset.sceneState === 'active') start();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
