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
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import {
  CAMERA,
  CubeEngine,
  type CameraPreset,
  StandaloneRuntime,
  type ModuleStateName,
  type Theme,
} from '../../../packages/cube-engine/src/index';

/**
 * Real attachment points in the cube's LOCAL space (same space as the cubelet
 * lattice; the assembled surface sits at ≈±1.56). Each module plugs into a distinct
 * physical feature — face, edge or corner — at its own depth. Every frame the port
 * is transformed by the cube's live world matrix, so cables leave the actual moving
 * geometry (breathing, idle rotation, camera, parallax). The cube owns the ports.
 */
const PORT_LOCAL: Record<string, readonly [number, number, number]> = {
  telegram: [-1.55, 0.6, 0.25], // left face, upper
  crm: [-1.55, -0.7, 1.35], // front-left vertical edge, lower
  tasks: [-0.6, -1.55, 0.8], // bottom face, front-left
  analytics: [0.75, 1.55, 0.7], // top face, front-right
  ai: [1.55, -0.2, 0.3], // right face
  api: [1.4, -1.4, 1.2], // front-bottom-right corner
};
/** Per-module pulse timing (deliberately desynced so the network breathes). */
const PULSE: Record<string, { dur: number; phase: number }> = {
  telegram: { dur: 3.1, phase: 0.0 },
  crm: { dur: 3.7, phase: 0.35 },
  tasks: { dur: 2.8, phase: 0.6 },
  analytics: { dur: 3.4, phase: 0.15 },
  ai: { dur: 2.6, phase: 0.8 },
  api: { dur: 3.9, phase: 0.45 },
};
const CABLE_SAMPLES = 28; // points along each cable
const CABLE_WIDTH = 0.06; // world-space half-width of the glowing ribbon

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
  {
    id: 'hero',
    state: 'idle',
    accent: 1.25,
    rest: 'rich',
    // The hero frames the cube as a compact intelligent hub: the lens sits well back
    // of the idle default ([0,0.8,6]) so the cube reads ~40% smaller, opening the
    // negative space the connection network needs. It stays the centre of gravity —
    // just no longer crowding the frame. Still a long, calm lens (§7.7).
    camera: { position: [0, 0.5, 9.0], target: [0, 0, 0], fov: CAMERA.fov },
  },
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

  // --- 3D connection cables ------------------------------------------------------
  // The connections are REAL objects in the engine's scene, not a screen overlay.
  // Each module's cable leaves its port ON the cube and follows a cubic bezier through
  // world space as a camera-facing glowing ribbon — perspective-correct, moved by the
  // camera, and occluded by the cube when it passes behind it. The far end fades toward
  // the module's DOM card (the final blend to the flat UI). A pulse travels the ribbon
  // in 3D; when it reaches the end we emit `hero-pulse` so the DOM module reacts in
  // sync. Consumer-side only: we add meshes to engine.scene and read cube/camera — the
  // engine itself is untouched.
  const cube = engine.cube;
  const camera = engine.camera;
  const scene = engine.scene;
  const N = CABLE_SAMPLES;

  interface Cable {
    id: string;
    node: HTMLElement;
    mesh: Mesh;
    positions: Float32Array;
    colors: Float32Array;
    prevPp: number;
  }
  const cables: Cable[] = [];
  for (const id of Object.keys(PORT_LOCAL)) {
    const node = document.querySelector<HTMLElement>(`[data-node="${id}"]`);
    if (!node) continue;
    const positions = new Float32Array(N * 2 * 3);
    const colors = new Float32Array(N * 2 * 4);
    const index = new Uint16Array((N - 1) * 6);
    for (let i = 0; i < N - 1; i++) {
      const o = i * 6;
      const a = i * 2;
      index[o] = a; index[o + 1] = a + 1; index[o + 2] = a + 2;
      index[o + 3] = a + 1; index[o + 4] = a + 3; index[o + 5] = a + 2;
    }
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(positions, 3));
    geom.setAttribute('color', new BufferAttribute(colors, 4));
    geom.setIndex(new BufferAttribute(index, 1));
    const mat = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    const mesh = new Mesh(geom, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 10; // after the opaque cube
    scene.add(mesh);
    cables.push({ id, node, mesh, positions, colors, prevPp: 0 });
  }

  const vPort = new Vector3();
  const vCentre = new Vector3();
  const vEnd = new Vector3();
  const vProj = new Vector3();

  const updateCables = (timeMs: number): void => {
    const active = activeBeat.id === 'hero';
    for (const c of cables) c.mesh.visible = active;
    if (!active || cables.length === 0) return;

    cube.object.updateWorldMatrix(true, false);
    camera.updateMatrixWorld(true);
    const m = cube.object.matrixWorld;
    vCentre.set(0, 0, 0).applyMatrix4(m);
    vProj.copy(vCentre).project(camera);
    const centreSX = (vProj.x * 0.5 + 0.5) * window.innerWidth;
    const centreSY = (-vProj.y * 0.5 + 0.5) * window.innerHeight;

    const acc = engine.theme.preset.accent.color;
    const ar = ((acc >> 16) & 255) / 255;
    const ag = ((acc >> 8) & 255) / 255;
    const ab = (acc & 255) / 255;
    const cpx = camera.position.x;
    const cpy = camera.position.y;
    const cpz = camera.position.z;

    for (const c of cables) {
      const lp = PORT_LOCAL[c.id];
      vPort.set(lp[0], lp[1], lp[2]).applyMatrix4(m);
      vProj.copy(vPort).project(camera);
      const portZ = vProj.z; // keep the whole cable near the cube's depth plane

      // The module's DOM card edge, on the side facing the cube → world at port depth.
      const r = c.node.getBoundingClientRect();
      const mcx = r.left + r.width / 2;
      const mcy = r.top + r.height / 2;
      const dx = centreSX - mcx;
      const dy = centreSY - mcy;
      const sEdge = Math.min(r.width / 2 / (Math.abs(dx) || 1), r.height / 2 / (Math.abs(dy) || 1));
      const edgeX = mcx + dx * sEdge;
      const edgeY = mcy + dy * sEdge;
      vEnd
        .set((edgeX / window.innerWidth) * 2 - 1, -((edgeY / window.innerHeight) * 2 - 1), portZ)
        .unproject(camera);

      const p0x = vPort.x, p0y = vPort.y, p0z = vPort.z;
      const p3x = vEnd.x, p3y = vEnd.y, p3z = vEnd.z;
      // leave the surface along the outward normal (port direction from cube centre)
      let ox = p0x - vCentre.x, oy = p0y - vCentre.y, oz = p0z - vCentre.z;
      const ol = Math.hypot(ox, oy, oz) || 1;
      ox /= ol; oy /= ol; oz /= ol;
      const chord = Math.hypot(p3x - p0x, p3y - p0y, p3z - p0z) || 1;
      const lx = (p3x - p0x) / chord, ly = (p3y - p0y) / chord, lz = (p3z - p0z) / chord;
      const p1x = p0x + ox * chord * 0.4, p1y = p0y + oy * chord * 0.4, p1z = p0z + oz * chord * 0.4;
      const p2x = p3x - lx * chord * 0.28, p2y = p3y - ly * chord * 0.28, p2z = p3z - lz * chord * 0.28;

      const pl = PULSE[c.id] || { dur: 3, phase: 0 };
      const pp = REDUCED_MOTION ? -1 : (timeMs / 1000 / pl.dur + pl.phase) % 1;
      if (!REDUCED_MOTION) {
        if (pp < c.prevPp) window.dispatchEvent(new CustomEvent('hero-pulse', { detail: { id: c.id } }));
        c.prevPp = pp;
      }

      const pos = c.positions;
      const col = c.colors;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const mt = 1 - t;
        const bx = mt * mt * mt * p0x + 3 * mt * mt * t * p1x + 3 * mt * t * t * p2x + t * t * t * p3x;
        const by = mt * mt * mt * p0y + 3 * mt * mt * t * p1y + 3 * mt * t * t * p2y + t * t * t * p3y;
        const bz = mt * mt * mt * p0z + 3 * mt * mt * t * p1z + 3 * mt * t * t * p2z + t * t * t * p3z;
        const d0 = 3 * mt * mt, d1 = 6 * mt * t, d2 = 3 * t * t;
        const tx = d0 * (p1x - p0x) + d1 * (p2x - p1x) + d2 * (p3x - p2x);
        const ty = d0 * (p1y - p0y) + d1 * (p2y - p1y) + d2 * (p3y - p2y);
        const tz = d0 * (p1z - p0z) + d1 * (p2z - p1z) + d2 * (p3z - p2z);
        const wx = cpx - bx, wy = cpy - by, wz = cpz - bz;
        // camera-facing perpendicular = tangent × view
        let ex = ty * wz - tz * wy;
        let ey = tz * wx - tx * wz;
        let ez = tx * wy - ty * wx;
        const el = Math.hypot(ex, ey, ez) || 1;
        ex /= el; ey /= el; ez /= el;
        const width = CABLE_WIDTH * (0.55 + 0.45 * Math.sin(Math.PI * t));
        const i0 = i * 2 * 3;
        const i1 = i0 + 3;
        pos[i0] = bx + ex * width; pos[i0 + 1] = by + ey * width; pos[i0 + 2] = bz + ez * width;
        pos[i1] = bx - ex * width; pos[i1 + 1] = by - ey * width; pos[i1 + 2] = bz - ez * width;

        // alpha: emerge at the surface, fade into the DOM card at the far end
        let a = 1;
        if (t < 0.06) a = t / 0.06;
        else if (t > 0.78) a = Math.max(0, (1 - t) / 0.22);
        const bump = pp < 0 ? 0 : Math.exp(-(((t - pp) / 0.05) ** 2));
        const alpha = Math.min(1, a * (0.32 + bump));
        const cs = 0.75 + 1.3 * bump;
        const c0 = i * 2 * 4;
        const c1 = c0 + 4;
        col[c0] = ar * cs; col[c0 + 1] = ag * cs; col[c0 + 2] = ab * cs; col[c0 + 3] = alpha;
        col[c1] = ar * cs; col[c1 + 1] = ag * cs; col[c1 + 2] = ab * cs; col[c1 + 3] = alpha;
      }
      (c.mesh.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
      (c.mesh.geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
    }
  };

  let cableRAF = 0;
  const cableLoop = (t: number): void => {
    cableRAF = requestAnimationFrame(cableLoop);
    updateCables(t);
  };
  cableRAF = requestAnimationFrame(cableLoop);

  window.addEventListener(
    'pagehide',
    () => {
      window.clearTimeout(acknowledgeTimer);
      cancelAnimationFrame(cableRAF);
      for (const c of cables) {
        scene.remove(c.mesh);
        c.mesh.geometry.dispose();
        (c.mesh.material as MeshBasicMaterial).dispose();
      }
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
