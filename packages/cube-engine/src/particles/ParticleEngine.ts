import {
  CatmullRomCurve3,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three';
import type { Disposable, Updatable } from '../core/types';

export interface ParticleSpec {
  position: Vector3;
  velocity?: Vector3;
  lifetime: number;
  size?: number;
  drag?: number;
  curve?: CatmullRomCurve3;
  curveSpeed?: number;
}

export interface EmitterSpec {
  origin: Vector3;
  rate: number;
  particle: Omit<ParticleSpec, 'position'>;
  active?: boolean;
}

interface Particle {
  active: boolean;
  life: number;
  maxLife: number;
  size: number;
  drag: number;
  curveT: number;
  curveSpeed: number;
  curve: CatmullRomCurve3 | null;
  readonly position: Vector3;
  readonly velocity: Vector3;
}

interface Emitter {
  origin: Vector3;
  rate: number;
  particle: Omit<ParticleSpec, 'position'>;
  active: boolean;
  accumulator: number;
}

const DEFAULT_CAPACITY = 512;

/**
 * Pooled, instanced particle system. This stage ships the ENGINE only — no Hero
 * particles (Stage 2). Every particle is convergent or directional; particles
 * never drift as decorative dust (Creative §7.8). Fixed pool ⇒ zero allocation in
 * the render loop; recycled slots collapse to zero scale.
 */
export class ParticleEngine implements Updatable, Disposable {
  readonly object = new Group();

  private readonly particles: Particle[] = [];
  private readonly emitters = new Map<string, Emitter>();
  private readonly mesh: InstancedMesh;
  private readonly geometry: SphereGeometry;

  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
  private readonly identityQuat = new Quaternion();

  constructor(material: Material, capacity = DEFAULT_CAPACITY) {
    this.object.name = 'ParticleEngine';
    this.geometry = new SphereGeometry(1, 8, 8);
    this.mesh = new InstancedMesh(this.geometry, material, capacity);
    this.mesh.frustumCulled = false;
    this.object.add(this.mesh);
    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 1,
        size: 1,
        drag: 0,
        curveT: 0,
        curveSpeed: 0,
        curve: null,
        position: new Vector3(),
        velocity: new Vector3(),
      });
      this.write(i, 0);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  spawn(spec: ParticleSpec): boolean {
    const slot = this.particles.findIndex((p) => !p.active);
    if (slot === -1) return false;
    const p = this.particles[slot];
    p.active = true;
    p.life = spec.lifetime;
    p.maxLife = spec.lifetime;
    p.size = spec.size ?? 0.05;
    p.drag = spec.drag ?? 0;
    p.position.copy(spec.position);
    p.velocity.copy(spec.velocity ?? this.zero);
    p.curve = spec.curve ?? null;
    p.curveT = 0;
    p.curveSpeed = spec.curveSpeed ?? 0;
    return true;
  }

  burst(origin: Vector3, count: number, particle: Omit<ParticleSpec, 'position'>): void {
    for (let i = 0; i < count; i++) this.spawn({ ...particle, position: origin });
  }

  addEmitter(id: string, spec: EmitterSpec): void {
    this.emitters.set(id, {
      origin: spec.origin.clone(),
      rate: spec.rate,
      particle: spec.particle,
      active: spec.active ?? true,
      accumulator: 0,
    });
  }

  removeEmitter(id: string): void {
    this.emitters.delete(id);
  }

  setEmitterActive(id: string, active: boolean): void {
    const emitter = this.emitters.get(id);
    if (emitter) emitter.active = active;
  }

  clear(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.write(i, 0);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(delta: number): void {
    for (const emitter of this.emitters.values()) {
      if (!emitter.active) continue;
      emitter.accumulator += emitter.rate * delta;
      while (emitter.accumulator >= 1) {
        emitter.accumulator -= 1;
        this.spawn({ ...emitter.particle, position: emitter.origin });
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        this.write(i, 0);
        continue;
      }
      if (p.curve) {
        p.curveT = Math.min(1, p.curveT + p.curveSpeed * delta);
        p.curve.getPointAt(p.curveT, p.position);
      } else {
        if (p.drag > 0) p.velocity.multiplyScalar(Math.max(0, 1 - p.drag * delta));
        this.scratchScale.copy(p.velocity).multiplyScalar(delta);
        p.position.add(this.scratchScale);
      }
      const fade = Math.min(1, (p.life / p.maxLife) * 2);
      this.write(i, p.size * fade, p.position);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.mesh.dispose();
    this.particles.length = 0;
    this.emitters.clear();
  }

  private readonly zero = new Vector3();

  private write(index: number, scale: number, position?: Vector3): void {
    this.scratchScale.setScalar(scale);
    this.scratchMatrix.compose(position ?? this.zero, this.identityQuat, this.scratchScale);
    this.mesh.setMatrixAt(index, this.scratchMatrix);
  }
}
