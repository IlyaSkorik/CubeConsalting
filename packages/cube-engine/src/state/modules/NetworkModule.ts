import { Vector3 } from 'three';
import { CAMERA, CUBE } from '../../config/tokens';
import { easing } from '../../math/easing';
import type { Cubelet } from '../../cube/ProceduralCube';
import type { CubeModule, ModuleContext } from '../CubeModule';

const ease = easing('standard');
const easeReveal = easing('decelerate');

/** Shared with landing DOM — slower, confident reveal cadence. */
export const TRANSFORMATION = {
  introHold: 0.7,
  morphDuration: 1.75,
  holdAtPeak: 0.55,
  formCount: 4,
} as const;

const CELL = 1.08;

/** Total elapsed seconds before the platform rests into living idle. */
export function transformationCompleteAt(): number {
  const { introHold, morphDuration, holdAtPeak, formCount } = TRANSFORMATION;
  return introHold + formCount * (morphDuration + holdAtPeak);
}

/** Living idle — same language as Hero, gentler amplitudes for the settled core. */
const LIVING_YAW = (7 * Math.PI) / 180;
const LIVING_PITCH = (1 * Math.PI) / 180;
const LIVING_ROLL = (0.3 * Math.PI) / 180;
const LIVING_FLOAT = 0.025;
const LIVING_DAMP = 0.06;
const FINAL_FORM = TRANSFORMATION.formCount - 1;

const prefersReducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Personality {
  readonly ry: number;
  readonly rx: number;
  readonly rz: number;
  readonly scale: number;
}

/** Subtle operational states — the core never leaves centre, never explodes. */
const PERSONALITY: readonly Personality[] = [
  { ry: 0.1, rx: 0.14, rz: 0.02, scale: 1.0 },
  { ry: -0.08, rx: -0.05, rz: 0.0, scale: 1.02 },
  { ry: 0.18, rx: 0.06, rz: -0.03, scale: 0.99 },
  { ry: -0.14, rx: 0.1, rz: 0.05, scale: 1.01 },
];

/**
 * Platform Reveal — one intelligence, four operational shells (Creative §2, Beat 2).
 * The cube performs restrained in-place transformations while DOM shells emerge.
 * No construction, no deployment, no energy pulses.
 */
export class NetworkModule implements CubeModule {
  readonly id = 'network' as const;

  private readonly pos = new Vector3();
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private elapsed = 0;
  private enteredAt = -1;
  private smoothedRx: number | null = null;
  private smoothedRy: number | null = null;
  private smoothedRz: number | null = null;
  private smoothedPy: number | null = null;

  enter(ctx: ModuleContext): void {
    this.elapsed = 0;
    this.enteredAt = -1;
    this.smoothedRx = null;
    this.smoothedRy = null;
    this.smoothedRz = null;
    this.smoothedPy = null;
    ctx.cube.object.scale.setScalar(CUBE.scale);
    ctx.cube.object.rotation.set(0, 0, 0);
    ctx.cube.object.position.y = 0;
    ctx.cube.setDampingLambda(5);
    ctx.energy.clear();
    ctx.cube.resetToHome();
    ctx.camera.applyPreset({ position: [0, 0.15, 8.6], target: [0, 0, 0], fov: CAMERA.fov });
  }

  exit(ctx: ModuleContext): void {
    ctx.cube.resetToHome();
    ctx.cube.object.rotation.set(0, 0, 0);
    ctx.cube.object.position.y = 0;
  }

  update(_delta: number, elapsed: number, ctx: ModuleContext): void {
    if (this.enteredAt < 0) this.enteredAt = elapsed;
    this.elapsed = elapsed - this.enteredAt;

    if (this.elapsed >= transformationCompleteAt()) {
      this.applyLivingIdle(ctx);
      return;
    }

    const phase = this.phaseAt(this.elapsed);
    const fromForm = phase.fromForm;
    const toForm = phase.toForm;
    const morphT = phase.morphT;

    for (const c of ctx.cube.cubelets) {
      this.from.copy(fromForm < 0 ? c.home : this.formPosition(c, fromForm));
      this.to.copy(this.formPosition(c, toForm));
      c.targetPosition.copy(this.from).lerp(this.to, morphT);

      const sFrom = fromForm < 0 ? 1 : this.formScale(c, fromForm);
      const sTo = this.formScale(c, toForm);
      c.targetScale.setScalar(sFrom + (sTo - sFrom) * morphT);
      c.targetQuaternion.identity();
    }

    const pFrom = fromForm < 0 ? PERSONALITY[0] : PERSONALITY[fromForm];
    const pTo = PERSONALITY[toForm];
    const t = easeReveal(morphT);
    ctx.cube.object.rotation.set(
      pFrom.rx + (pTo.rx - pFrom.rx) * t,
      pFrom.ry + (pTo.ry - pFrom.ry) * t,
      pFrom.rz + (pTo.rz - pFrom.rz) * t,
    );
    const breath = 1 + Math.sin(this.elapsed * 0.75) * 0.004;
    ctx.cube.object.scale.setScalar(CUBE.scale * (pFrom.scale + (pTo.scale - pFrom.scale) * t) * breath);
  }

  phaseAt(elapsed: number): {
    form: number;
    fromForm: number;
    toForm: number;
    morphT: number;
    inHold: boolean;
  } {
    const { introHold, morphDuration, holdAtPeak, formCount } = TRANSFORMATION;
    const segment = morphDuration + holdAtPeak;

    if (elapsed < introHold) {
      return { form: -1, fromForm: -1, toForm: 0, morphT: ease(elapsed / introHold), inHold: false };
    }

    const t = elapsed - introHold;
    const idx = Math.min(formCount - 1, Math.floor(t / segment));
    const local = t - idx * segment;

    if (local < morphDuration) {
      const morphT = easeReveal(local / morphDuration);
      return {
        form: idx,
        fromForm: idx === 0 ? -1 : idx - 1,
        toForm: idx,
        morphT,
        inHold: false,
      };
    }

    return { form: idx, fromForm: idx, toForm: idx, morphT: 1, inHold: true };
  }

  private formPosition(c: Cubelet, form: number): Vector3 {
    const nx = (c.grid.x - 1) * CELL;
    const ny = (c.grid.y - 1) * CELL;
    const nz = (c.grid.z - 1) * CELL;
    const r = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    switch (form) {
      case 0:
        this.pos.set(nx * 1.18, ny * 0.62, nz * 1.12);
        break;
      case 1:
        this.pos.set(nx * 0.72, ny * 1.28, nz * 0.72);
        break;
      case 2: {
        const shell = r > CELL * 0.55 ? 1.08 : 0.42;
        this.pos.set(nx * shell, ny * shell, nz * shell);
        break;
      }
      default:
        this.pos.set(
          nx * 1.02 + Math.sin(ny * 1.2) * 0.14,
          ny * 0.88 + Math.cos(nx * 0.9) * 0.1,
          nz * 0.98 + Math.sin(nx * 0.7 + nz * 0.5) * 0.12,
        );
        break;
    }
    return this.pos;
  }

  private formScale(c: Cubelet, form: number): number {
    const r = Math.hypot(c.grid.x - 1, c.grid.y - 1, c.grid.z - 1);
    switch (form) {
      case 0:
        return 0.92 + (1 - Math.abs(c.grid.y - 1)) * 0.06;
      case 1:
        return 0.9 + r * 0.04;
      case 2:
        return r > 0.5 ? 0.88 : 0.78;
      default:
        return 0.9 + Math.sin(c.index * 0.7) * 0.03;
    }
  }

  /** Resting intelligence after all shells are present — calm, quasi-periodic sway. */
  private applyLivingIdle(ctx: ModuleContext): void {
    for (const c of ctx.cube.cubelets) {
      c.targetPosition.copy(this.formPosition(c, FINAL_FORM));
      c.targetScale.setScalar(this.formScale(c, FINAL_FORM));
      c.targetQuaternion.identity();
    }

    const base = PERSONALITY[FINAL_FORM];
    let tX: number;
    let tY: number;
    let tZ: number;
    let tPy: number;

    if (prefersReducedMotion()) {
      tX = base.rx;
      tY = base.ry;
      tZ = base.rz;
      tPy = 0;
    } else {
      const s = this.elapsed;
      tY =
        base.ry +
        LIVING_YAW * (0.82 * Math.sin(s * 0.314) + 0.18 * Math.sin(s * 0.497 + 1.3));
      tX =
        base.rx +
        LIVING_PITCH * (0.7 * Math.sin(s * 0.399 + 0.5) + 0.3 * Math.sin(s * 0.259));
      tZ = base.rz + LIVING_ROLL * Math.sin(s * 0.217 + 2.1);
      tPy = LIVING_FLOAT * (0.7 * Math.sin(s * 0.549) + 0.3 * Math.sin(s * 0.364 + 0.8));
    }

    let rx = this.smoothedRx;
    let ry = this.smoothedRy;
    let rz = this.smoothedRz;
    let py = this.smoothedPy;
    if (rx === null || ry === null || rz === null || py === null) {
      rx = ctx.cube.object.rotation.x;
      ry = ctx.cube.object.rotation.y;
      rz = ctx.cube.object.rotation.z;
      py = ctx.cube.object.position.y;
    }

    const k = LIVING_DAMP;
    rx += (tX - rx) * k;
    ry += (tY - ry) * k;
    rz += (tZ - rz) * k;
    py += (tPy - py) * k;
    this.smoothedRx = rx;
    this.smoothedRy = ry;
    this.smoothedRz = rz;
    this.smoothedPy = py;

    ctx.cube.object.rotation.set(rx, ry, rz);
    ctx.cube.object.position.y = py;

    const breath = 1 + Math.sin(this.elapsed * 0.331) * 0.004;
    ctx.cube.object.scale.setScalar(CUBE.scale * base.scale * breath);
  }
}
