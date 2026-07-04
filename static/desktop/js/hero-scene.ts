/**
 * Hero Scene — "Birth of Intelligence".
 *
 * This file CONSUMES @cublab/cube-engine. It creates no renderer, cube, camera,
 * material or particle system of its own — it only configures the engine and
 * wires it to the DOM. All motion follows the Motion Bible (docs/architecture/02).
 */
import {
  CubeEngine,
  StandaloneRuntime,
  type Theme,
} from '../../../packages/cube-engine/src/index';

const ACCENT_HERO_BOOST = 1.25;
const ACKNOWLEDGE_DELAY_MS = 2200;
const HANDOFF_IN = 0.35;
const HANDOFF_OUT = 0.15;

const CORE_PATH_VERTICAL = 'hero-core-y';
const CORE_PATH_DIAGONAL = 'hero-core-d';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Slow energy travelling through the core = the intelligence is alive (Motion Bible §2, §7.8). */
function configureIdleEnergy(engine: CubeEngine): void {
  const { energy } = engine;
  energy.clear(); // idempotent: called on boot and again when idle re-settles
  energy.addPath(CORE_PATH_VERTICAL, [[0, -1.7, 0], [0, 0, 0], [0, 1.7, 0]]);
  energy.addPath(CORE_PATH_DIAGONAL, [[-1.4, -1.4, -1.4], [0, 0, 0], [1.4, 1.4, 1.4]]);
  energy.emitPulse(CORE_PATH_VERTICAL, { loop: true, speed: 0.32, intensity: 0.9 });
  energy.emitPulse(CORE_PATH_DIAGONAL, { loop: true, speed: 0.26, intensity: 0.7 });
}

function tuneLighting(engine: CubeEngine): void {
  engine.lighting.setAccentIntensity(engine.theme.preset.accent.intensity * ACCENT_HERO_BOOST);
}

function bootHero(wrapper: HTMLElement, canvas: HTMLCanvasElement, section: HTMLElement): void {
  let engine: CubeEngine;
  let runtime: StandaloneRuntime;

  try {
    engine = new CubeEngine({ theme: currentTheme(), transparent: true });
    runtime = new StandaloneRuntime(engine, wrapper, { canvas, interactionTarget: section });
  } catch (error) {
    // No WebGL / context lost: the section's background image is the graceful fallback.
    console.warn('[hero] 3D unavailable — falling back to static background.', error);
    return;
  }

  runtime.start('idle');
  configureIdleEnergy(engine);
  tuneLighting(engine);

  // Hover: subtle attention + a brighter pulse of energy. Never exaggerated (§3).
  engine.events.on('HOVER_START', () => {
    engine.energy.emitPulse(CORE_PATH_VERTICAL, { speed: 0.7, intensity: 1.4 });
  });

  // Keep lighting tuned and idle energy alive across theme swaps (applyTheme resets both).
  engine.events.on('THEME_CHANGED', () => {
    tuneLighting(engine);
  });
  engine.events.on('CUBE_STATE_CHANGED', ({ to }) => {
    if (to === 'idle') configureIdleEnergy(engine);
  });

  // Theme follows the site toggle (navbar.js writes data-theme on <html>).
  const themeObserver = new MutationObserver(() => engine.setTheme(currentTheme()));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // The cube acknowledges the user shortly after arrival with a subtle energy sweep (§3).
  const acknowledgeTimer = window.setTimeout(() => {
    engine.energy.emitPulse(CORE_PATH_DIAGONAL, { speed: 0.9, intensity: 1.6 });
  }, ACKNOWLEDGE_DELAY_MS);

  // Scroll hands off to the next chapter: the cube reaches out (idle → network, §5 Beat 2).
  let handedOff = false;
  const onScroll = (): void => {
    const rect = section.getBoundingClientRect();
    const height = rect.height || 1;
    const progress = Math.min(1, Math.max(0, -rect.top / height));
    if (!handedOff && progress > HANDOFF_IN) {
      handedOff = true;
      engine.transitionTo('network');
    } else if (handedOff && progress < HANDOFF_OUT) {
      handedOff = false;
      engine.transitionTo('idle');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener(
    'pagehide',
    () => {
      window.clearTimeout(acknowledgeTimer);
      themeObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      runtime.dispose();
    },
    { once: true },
  );
}

const wrapper = document.getElementById('hero-3d-wrapper');
const canvas = document.getElementById('hero-canvas');
const section = document.getElementById('hero');

if (wrapper && canvas instanceof HTMLCanvasElement && section) {
  bootHero(wrapper, canvas, section);
} else {
  console.warn('[hero] Missing #hero-3d-wrapper / #hero-canvas / #hero — 3D not mounted.');
}
