import { Vector3 } from 'three';
import { CAMERA, CUBE } from '../../config/tokens';
import { easing } from '../../math/easing';
import type { Cubelet } from '../../cube/ProceduralCube';
import type { CubeModule, ModuleContext } from '../CubeModule';

const ease = easing('standard');

/** Shared with the landing DOM builder — keep timings aligned. */
export const CONSTRUCTION = {
  blueprintHold: 0.55,
  armDuration: 1.15,
  armStagger: 0.42,
  armCount: 4,
} as const;

const CUBES_PER_ARM = 6;
const SPACING = 0.44;

/** Module sites — each maps to a product card direction from the core. */
const SITES: readonly [number, number, number][] = [
  [3.35, 1.45, 0.35],
  [3.55, 0.1, 0.15],
  [3.15, -1.65, 0.1],
  [-3.35, -1.15, 0.3],
];

/**
 * Construction beat — cubelets detach, travel through space, and settle into
 * ordered compositions before each card assembles. One arm at a time; no beams,
 * no pulses — modular blocks are the story.
 */
export class NetworkModule implements CubeModule {
  readonly id = 'network' as const;

  private readonly slot = new Vector3();
  private readonly arc = new Vector3();
  private arms: Cubelet[][] = [[], [], [], []];
  private armSlots: Vector3[][] = [[], [], [], []];
  private elapsed = 0;
  private enteredAt = -1;

  enter(ctx: ModuleContext): void {
    this.elapsed = 0;
    this.enteredAt = -1;
    ctx.cube.object.scale.setScalar(CUBE.scale);
    ctx.cube.object.rotation.set(0, 0, 0);
    ctx.cube.setDampingLambda(5.5);
    ctx.energy.clear();

    this.arms = [[], [], [], []];
    this.armSlots = SITES.map(() => []);

    const surfaceByArm: Cubelet[][] = [[], [], [], []];
    for (const c of ctx.cube.cubelets) {
      if (!ctx.cube.isSurface(c)) {
        c.targetPosition.copy(c.home);
        c.targetScale.setScalar(1);
        c.targetQuaternion.identity();
        continue;
      }
      surfaceByArm[this.armFor(c.home)].push(c);
    }

    for (let a = 0; a < CONSTRUCTION.armCount; a++) {
      const pool = surfaceByArm[a]
        .sort((x, y) => this.facePriority(a, x.home) - this.facePriority(a, y.home))
        .slice(0, CUBES_PER_ARM);
      this.arms[a] = pool;
      for (let i = 0; i < pool.length; i++) {
        this.armSlots[a].push(this.formationSlot(a, i, pool.length, SITES[a]));
      }
      for (const c of pool) {
        c.targetPosition.copy(c.home);
        c.targetScale.setScalar(1);
        c.targetQuaternion.identity();
      }
    }

    for (const c of ctx.cube.cubelets) {
      if (this.isDeployed(c)) continue;
      if (!ctx.cube.isSurface(c)) continue;
      c.targetPosition.copy(c.home);
      c.targetScale.setScalar(0.92);
    }

    ctx.camera.applyPreset({ position: [0, 0.4, 8.4], target: [0, 0, 0], fov: CAMERA.fov });
  }

  exit(): void {
    this.arms = [[], [], [], []];
    this.armSlots = [];
  }

  update(_delta: number, elapsed: number, ctx: ModuleContext): void {
    if (this.enteredAt < 0) this.enteredAt = elapsed;
    this.elapsed = elapsed - this.enteredAt;
    const { blueprintHold, armDuration, armStagger, armCount } = CONSTRUCTION;

    let activeArm = armCount - 1;
    for (let a = 0; a < armCount; a++) {
      const t0 = blueprintHold + a * armStagger;
      if (this.elapsed < t0 + armDuration) {
        activeArm = a;
        break;
      }
    }

    for (let a = 0; a < armCount; a++) {
      const t0 = blueprintHold + a * armStagger;
      const raw = Math.max(0, Math.min(1, (this.elapsed - t0) / armDuration));
      const settled = a < activeArm || raw >= 1;
      const armT = settled ? 1 : ease(raw);
      const cubelets = this.arms[a];
      const slots = this.armSlots[a];
      const count = cubelets.length;

      for (let i = 0; i < count; i++) {
        const c = cubelets[i];
        const home = c.home;
        const target = slots[i];

        const depart = (i / Math.max(1, count)) * 0.68;
        const t = settled
          ? 1
          : ease(Math.max(0, Math.min(1, (armT - depart) / (1 - depart))));

        if (t <= 0) {
          c.targetPosition.copy(home);
          c.targetScale.setScalar(1);
          continue;
        }

        this.arc.copy(home).lerp(target, 0.5);
        this.arc.y += 0.65 + i * 0.04;
        const u = ease(t);
        const mt = 1 - u;
        this.slot
          .copy(home)
          .multiplyScalar(mt * mt)
          .addScaledVector(this.arc, 2 * mt * u)
          .addScaledVector(target, u * u);
        c.targetPosition.copy(this.slot);

        const inFlight = t > 0.05 && t < 0.92;
        c.targetScale.setScalar(inFlight ? 0.88 + u * 0.08 : 0.78 + u * 0.14);
      }
    }

    const corePulse = 1 + Math.sin(this.elapsed * 0.9) * 0.004;
    for (const c of ctx.cube.cubelets) {
      if (ctx.cube.isSurface(c)) continue;
      c.targetScale.setScalar(corePulse);
    }
  }

  private isDeployed(c: Cubelet): boolean {
    for (const arm of this.arms) {
      if (arm.includes(c)) return true;
    }
    return false;
  }

  private armFor(home: Vector3): number {
    if (home.x < -0.35) return 3;
    if (home.y > 0.35) return 0;
    if (home.y < -0.35) return 2;
    return 1;
  }

  /** Prefer cubelets on the face that leads toward each module site. */
  private facePriority(arm: number, home: Vector3): number {
    if (arm === 0) return -home.y * 2 - home.x;
    if (arm === 1) return -home.x * 2 + Math.abs(home.y);
    if (arm === 2) return home.y * 2 - home.x;
    return home.x * 2 - home.y;
  }

  /** Intentional compositions — panel, stack, frame, array. */
  private formationSlot(
    arm: number,
    index: number,
    total: number,
    site: readonly [number, number, number],
  ): Vector3 {
    this.slot.set(site[0], site[1], site[2]);
    const s = SPACING;

    switch (arm) {
      case 0: {
        const cols = 3;
        const col = index % cols;
        const row = Math.floor(index / cols);
        this.slot.x += (col - 1) * s;
        this.slot.y += (0.5 - row) * s * 0.85;
        this.slot.z += row * 0.07;
        break;
      }
      case 1: {
        const layer = index % 3;
        const column = Math.floor(index / 3);
        this.slot.x += (column - 0.5) * s * 0.7;
        this.slot.y += (1 - layer) * s * 0.42;
        this.slot.z += layer * 0.11;
        break;
      }
      case 2: {
        const ring = [
          [-1, 1], [0, 1], [1, 1],
          [-1, 0], [1, 0],
          [-1, -1],
        ];
        const p = ring[index % ring.length];
        this.slot.x += p[0] * s * 0.75;
        this.slot.y += p[1] * s * 0.6;
        this.slot.z += (index % 2) * 0.09;
        break;
      }
      default: {
        const cols = 3;
        const col = index % cols;
        const row = Math.floor(index / cols);
        this.slot.x += (col - 1) * s * 0.72;
        this.slot.y += (0.5 - row) * s * 0.5;
        this.slot.z += row * 0.06;
        break;
      }
    }

    return this.slot.clone();
  }
}
