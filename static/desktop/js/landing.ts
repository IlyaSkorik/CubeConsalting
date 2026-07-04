/**
 * Landing Experience — the one continuous journey.
 *
 * This file CONSUMES @cublab/cube-engine. It creates no renderer, cube, camera,
 * material, energy or particle system of its own. There is ONE engine, ONE cube,
 * ONE scene, ONE render loop for the entire page. As the user scrolls, the single
 * cube transforms from state to state — it never disappears, the camera never
 * teleports, nothing resets. Scrolling back perfectly reverses the journey because
 * re-entering a section re-applies that section's beat.
 *
 * All motion follows the Motion Bible (docs/architecture/02-creative-direction.md).
 * The modules themselves own each state's cube pose, camera preset and energy; this
 * controller decides WHEN to transition and layers the per-beat "personality"
 * (accent lighting, resting energy, arrival pulse) that the modules leave open.
 */
import {
  CAMERA,
  CubeEngine,
  type CameraPreset,
  StandaloneRuntime,
  type ModuleStateName,
  type Theme,
} from '../../../packages/cube-engine/src/index';

/** A single station on the journey: a section on the page ↔ a cube state + flavor. */
interface Beat {
  /** id of the <section> that, when dominant in the viewport, owns this beat. */
  readonly id: string;
  /** Which cube state the one cube occupies while this section leads. */
  readonly state: ModuleStateName;
  /** Accent-light multiplier over the theme preset — the cube's inner energy. */
  readonly accent: number;
  /** Resting energy flavor, only meaningful for the calm `idle` beats. */
  readonly rest?: 'rich' | 'subtle';
  /** Optional camera refinement applied after the module's own preset, for beats
   *  that want a distinct framing (e.g. the final rest pulls back and calms). */
  readonly camera?: CameraPreset;
}

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The eight-beat scroll story (Motion Bible §5) mapped onto the real page sections.
 * rest → reach → reason → work → offer → rest. Only five cube modules exist; the
 * journey reuses them with distinct camera/energy/accent so each beat feels its own
 * while never duplicating an engine system.
 *
 *   hero      idle      the resting mind
 *   solutions network   the platform reaches into external systems
 *   case      data      the platform reasons over information (living data surface)
 *   lab       grid      procedural workflow executing across modules
 *   demo      assembly  everything converges into one perfect cube (the invitation)
 *   footer    idle      the intelligence settles back to rest, breathing slows
 */
const BEATS: readonly Beat[] = [
  { id: 'hero', state: 'idle', accent: 1.25, rest: 'rich' },
  { id: 'solutions', state: 'network', accent: 1.45 },
  { id: 'case', state: 'data', accent: 1.2 },
  { id: 'lab', state: 'grid', accent: 1.35 },
  { id: 'demo', state: 'assembly', accent: 1.15 },
  {
    id: 'footer',
    state: 'idle',
    accent: 0.9,
    rest: 'subtle',
    // The intelligence settles: camera drifts back, the lens calms (Motion Bible §5 Beat 8).
    camera: { position: [0, 0.6, 9], target: [0, 0, 0], fov: CAMERA.fovCalm },
  },
];

const ACKNOWLEDGE_DELAY_MS = 2200;

// Resting energy running through the core = the intelligence is alive (§2, §7.8).
const CORE_PATH_VERTICAL = 'core-y';
const CORE_PATH_DIAGONAL = 'core-d';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Slow energy travelling through the whole cube while it rests. Idempotent:
 *  IdleModule.enter() clears energy, so this re-arms it each time idle re-settles. */
function configureRestEnergy(engine: CubeEngine, subtle: boolean): void {
  const { energy } = engine;
  energy.clear();
  energy.addPath(CORE_PATH_VERTICAL, [
    [0, -1.7, 0],
    [0, 0, 0],
    [0, 1.7, 0],
  ]);
  energy.addPath(CORE_PATH_DIAGONAL, [
    [-1.4, -1.4, -1.4],
    [0, 0, 0],
    [1.4, 1.4, 1.4],
  ]);
  const gain = subtle ? 0.45 : 1;
  energy.emitPulse(CORE_PATH_VERTICAL, { loop: true, speed: subtle ? 0.2 : 0.32, intensity: 0.9 * gain });
  energy.emitPulse(CORE_PATH_DIAGONAL, { loop: true, speed: subtle ? 0.16 : 0.26, intensity: 0.7 * gain });
}

/**
 * Reveal choreography — content emerges as its section enters the viewport and
 * re-hides when it leaves, so the journey reverses perfectly on the way back up.
 * Deliberately independent of the cube engine: even with no WebGL the content
 * still reveals, so the page is never left with invisible cards.
 */
function setupReveal(): () => void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (targets.length === 0) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-revealed', entry.isIntersecting);
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -12% 0px' },
  );
  targets.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

function bootLanding(stage: HTMLElement, canvas: HTMLCanvasElement): void {
  let engine: CubeEngine;
  let runtime: StandaloneRuntime;

  try {
    engine = new CubeEngine({ theme: currentTheme(), transparent: true });
    runtime = new StandaloneRuntime(engine, stage, { canvas, interactionTarget: document.body });
  } catch (error) {
    // No WebGL / context lost: every section keeps its own static styling as the
    // graceful fallback, so the page remains complete without the cube.
    console.warn('[landing] 3D unavailable — running without the cube.', error);
    document.documentElement.dataset.cube = 'off';
    return;
  }

  document.documentElement.dataset.cube = 'on';

  const beatById = new Map(BEATS.map((b) => [b.id, b]));
  let activeBeat: Beat = BEATS[0];
  const baseAccent = engine.theme.preset.accent.intensity;

  // Section indicator rail reflects which station leads (one nervous system).
  const railDots = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-rail]').forEach((dot) => {
    const id = dot.dataset.rail;
    if (id) railDots.set(id, dot);
  });

  /** Push a beat's personality onto the shared engine (the cube leads — §6).
   *  Under reduced motion the cube holds its calm resting form: we skip the large
   *  state morphs and camera moves, but still light the accent and mark the active
   *  station so wayfinding and theming stay intact. */
  const applyBeat = (beat: Beat): void => {
    activeBeat = beat;
    if (!REDUCED_MOTION) {
      engine.transitionTo(beat.state);
      // A beat may refine framing after the module set its own preset (this wins).
      if (beat.camera) engine.cameraRig.applyPreset(beat.camera);
      if (beat.state === 'idle') configureRestEnergy(engine, beat.rest === 'subtle');
    }
    engine.lighting.setAccentIntensity(baseAccent * beat.accent);
    for (const [id, dot] of railDots) dot.classList.toggle('is-active', id === beat.id);
  };

  runtime.start(BEATS[0].state);
  applyBeat(BEATS[0]);

  // Fade the cube in only after it has actually drawn (two frames guarantees the
  // renderer has cleared and composited at least one full frame).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.dataset.cubeReady = '1';
    });
  });

  // Hover anywhere over the experience: a brighter breath of energy (§3). Never loud.
  // Suppressed for visitors who prefer reduced motion.
  if (!REDUCED_MOTION) {
    engine.events.on('HOVER_START', () => {
      engine.energy.emitPulse(CORE_PATH_VERTICAL, { speed: 0.7, intensity: 1.4 });
    });
  }

  // A theme swap resets lighting to the preset; restore the active beat's accent,
  // and re-arm resting energy if the cube is currently at rest.
  engine.events.on('THEME_CHANGED', () => {
    engine.lighting.setAccentIntensity(engine.theme.preset.accent.intensity * activeBeat.accent);
    if (!REDUCED_MOTION && activeBeat.state === 'idle') {
      configureRestEnergy(engine, activeBeat.rest === 'subtle');
    }
  });

  // Modules clear energy on enter; when the cube settles back to idle, re-arm the
  // resting energy flavor of whichever idle beat currently leads.
  engine.events.on('CUBE_STATE_CHANGED', ({ to }) => {
    if (!REDUCED_MOTION && to === 'idle' && activeBeat.state === 'idle') {
      configureRestEnergy(engine, activeBeat.rest === 'subtle');
    }
  });

  // Theme follows the site toggle (navbar.js writes data-theme on <html>).
  const themeObserver = new MutationObserver(() => engine.setTheme(currentTheme()));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // The cube acknowledges arrival with one subtle energy sweep shortly after load (§3).
  const acknowledgeTimer = REDUCED_MOTION
    ? 0
    : window.setTimeout(() => {
        engine.energy.emitPulse(CORE_PATH_DIAGONAL, { speed: 0.9, intensity: 1.6 });
      }, ACKNOWLEDGE_DELAY_MS);

  // The journey is driven by which section leads the viewport. IntersectionObserver
  // is inherently reversible: scrolling back makes the previous section dominant
  // again, which re-applies its beat — no manual reverse logic, no resets.
  const ratios = new Map<string, number>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      let leaderId = activeBeat.id;
      let best = -1;
      for (const beat of BEATS) {
        const r = ratios.get(beat.id) ?? 0;
        if (r > best) {
          best = r;
          leaderId = beat.id;
        }
      }
      const next = beatById.get(leaderId);
      if (next && next.id !== activeBeat.id) applyBeat(next);
    },
    { threshold: [0, 0.15, 0.35, 0.6, 0.85, 1], rootMargin: '-8% 0px -8% 0px' },
  );
  for (const beat of BEATS) {
    const el = document.getElementById(beat.id);
    if (el) observer.observe(el);
  }

  window.addEventListener(
    'pagehide',
    () => {
      window.clearTimeout(acknowledgeTimer);
      themeObserver.disconnect();
      observer.disconnect();
      runtime.dispose();
    },
    { once: true },
  );
}

// Reveal choreography runs for every visitor, independent of the cube.
const teardownReveal = setupReveal();
window.addEventListener('pagehide', () => teardownReveal(), { once: true });

const stage = document.getElementById('cube-stage');
const canvas = document.getElementById('cube-canvas');

if (stage && canvas instanceof HTMLCanvasElement) {
  bootLanding(stage, canvas);
} else {
  console.warn('[landing] Missing #cube-stage / #cube-canvas — the cube is not mounted.');
}
