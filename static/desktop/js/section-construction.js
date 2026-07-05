/*
 * Solutions — card assembly synced to cubelet construction.
 *
 * The 3D cubelets travel and settle into ordered compositions (NetworkModule).
 * This file owns only the DOM: one card at a time gathers, then assembles.
 * No beams, no connection lines — cubelets are the story.
 *
 * Timings align with NetworkModule CONSTRUCTION (landing.ts → __cubeConstruction).
 */
(function () {
  var REDUCED_MOTION =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var BLUEPRINT_HOLD = 0.55;
  var ARM_DURATION = 1.15;
  var ARM_STAGGER = 0.42;
  var ARM_COUNT = 4;
  var GATHER_END = 0.78;

  var PHASES = ['is-framed', 'is-glassed', 'is-content', 'is-status', 'is-viz', 'is-complete'];

  function constructionAt(t) {
    var arm = ARM_COUNT - 1;
    for (var a = 0; a < ARM_COUNT; a++) {
      var t0 = BLUEPRINT_HOLD + a * ARM_STAGGER;
      if (t < t0 + ARM_DURATION) {
        arm = a;
        break;
      }
    }
    return { arm: arm };
  }

  function clearPhases(card) {
    for (var p = 0; p < PHASES.length; p++) card.classList.remove(PHASES[p]);
  }

  function setComplete(card) {
    for (var p = 0; p < PHASES.length; p++) card.classList.add(PHASES[p]);
  }

  function applyAssembly(card, u) {
    var idx = Math.min(PHASES.length - 1, Math.floor(u * PHASES.length));
    for (var q = 0; q < PHASES.length; q++) {
      card.classList.toggle(PHASES[q], q <= idx);
    }
  }

  function init() {
    var section = document.getElementById('solutions');
    if (!section) return;

    var cards = Array.prototype.slice.call(section.querySelectorAll('.sol-card'));
    if (cards.length === 0) return;
    cards.sort(function (a, b) {
      return (+a.getAttribute('data-module') || 0) - (+b.getAttribute('data-module') || 0);
    });

    if (REDUCED_MOTION) {
      section.classList.add('is-complete');
      for (var r = 0; r < cards.length; r++) setComplete(cards[r]);
      return;
    }

    var phase = 'idle';
    var running = false;
    var localT = 0;
    var lastNow = 0;

    function armRaw(index) {
      var t0 = BLUEPRINT_HOLD + index * ARM_STAGGER;
      return Math.max(0, Math.min(1, (localT - t0) / ARM_DURATION));
    }

    function tick(now) {
      var pub = window.__cubeConstruction;
      if (pub && pub.ready) localT = pub.t;
      else if (phase === 'building') localT += Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;

      var c = constructionAt(localT);
      var allDone = localT >= BLUEPRINT_HOLD + (ARM_COUNT - 1) * ARM_STAGGER + ARM_DURATION;
      section.classList.toggle('is-constructing', phase === 'building' && !allDone);
      section.classList.toggle('is-complete', allDone);

      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var raw = armRaw(i);
        var isPast = i < c.arm;
        var isCurrent = i === c.arm;
        var isFuture = i > c.arm;

        card.classList.remove('is-focus', 'is-gathering');

        if (isPast || (isCurrent && raw >= 1)) {
          setComplete(card);
          continue;
        }

        if (isFuture || localT < BLUEPRINT_HOLD + i * ARM_STAGGER) {
          clearPhases(card);
          continue;
        }

        card.classList.add('is-focus');
        if (raw < GATHER_END) {
          if (raw >= 0.18) card.classList.add('is-gathering');
          clearPhases(card);
        } else {
          applyAssembly(card, (raw - GATHER_END) / (1 - GATHER_END));
        }
      }
    }

    function reset() {
      phase = 'idle';
      localT = 0;
      lastNow = 0;
      section.classList.remove('is-constructing', 'is-complete');
      for (var i = 0; i < cards.length; i++) {
        clearPhases(cards[i]);
        cards[i].classList.remove('is-focus', 'is-gathering');
      }
    }

    function begin() {
      phase = 'building';
      localT = 0;
      lastNow = performance.now();
    }

    function loop(now) {
      if (!running) return;
      tick(now);
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
            if (phase === 'idle') begin();
          } else {
            running = false;
            reset();
          }
        }
      },
      { threshold: 0.22 },
    );
    io.observe(section);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
