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
import { ENERGY } from '../config/tokens';
import type { Disposable, Updatable } from '../core/types';

export interface PulseOptions {
  speed?: number;
  intensity?: number;
  loop?: boolean;
}

interface Pulse {
  active: boolean;
  pathId: string;
  t: number;
  speed: number;
  intensity: number;
  loop: boolean;
}

const DEFAULT_CAPACITY = 128;

/**
 * Reusable energy system. Energy is a pulse with a source and a direction that
 * travels along a path — never sprayed decoration (Creative §7.8). Pulses share a
 * single InstancedMesh + additive material; inactive slots collapse to zero scale.
 * Built to later swap its per-pulse update for a GPU shader without API changes.
 */
export class EnergyEngine implements Updatable, Disposable {
  readonly object = new Group();

  private readonly paths = new Map<string, CatmullRomCurve3>();
  private readonly pulses: Pulse[] = [];
  private readonly mesh: InstancedMesh;
  private readonly geometry: SphereGeometry;

  private readonly scratchMatrix = new Matrix4();
  private readonly scratchPos = new Vector3();
  private readonly scratchScale = new Vector3();
  private readonly identityQuat = new Quaternion();

  constructor(material: Material, capacity = DEFAULT_CAPACITY) {
    this.object.name = 'EnergyEngine';
    this.geometry = new SphereGeometry(1, 12, 12);
    this.mesh = new InstancedMesh(this.geometry, material, capacity);
    this.mesh.frustumCulled = false;
    this.object.add(this.mesh);
    for (let i = 0; i < capacity; i++) {
      this.pulses.push({ active: false, pathId: '', t: 0, speed: 0, intensity: 0, loop: false });
      this.hide(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  addPath(id: string, points: ReadonlyArray<readonly [number, number, number]>): void {
    this.paths.set(id, new CatmullRomCurve3(points.map((p) => new Vector3(...p))));
  }

  removePath(id: string): void {
    this.paths.delete(id);
    for (let i = 0; i < this.pulses.length; i++) {
      if (this.pulses[i].pathId === id) this.deactivate(i);
    }
  }

  /** Fire a pulse along a path. Returns false if the pool is exhausted. */
  emitPulse(pathId: string, options: PulseOptions = {}): boolean {
    if (!this.paths.has(pathId)) return false;
    const slot = this.pulses.findIndex((p) => !p.active);
    if (slot === -1) return false;
    const pulse = this.pulses[slot];
    pulse.active = true;
    pulse.pathId = pathId;
    pulse.t = 0;
    pulse.speed = options.speed ?? ENERGY.pulseSpeed;
    pulse.intensity = options.intensity ?? ENERGY.defaultIntensity;
    pulse.loop = options.loop ?? false;
    return true;
  }

  clear(): void {
    for (let i = 0; i < this.pulses.length; i++) this.deactivate(i);
  }

  update(delta: number): void {
    for (let i = 0; i < this.pulses.length; i++) {
      const pulse = this.pulses[i];
      if (!pulse.active) continue;
      const curve = this.paths.get(pulse.pathId);
      if (!curve) {
        this.deactivate(i);
        continue;
      }
      pulse.t += pulse.speed * delta;
      if (pulse.t >= 1) {
        if (pulse.loop) pulse.t %= 1;
        else {
          this.deactivate(i);
          continue;
        }
      }
      curve.getPointAt(pulse.t, this.scratchPos);
      const size = ENERGY.pulseWidth * pulse.intensity;
      this.scratchScale.setScalar(size);
      this.scratchMatrix.compose(this.scratchPos, this.identityQuat, this.scratchScale);
      this.mesh.setMatrixAt(i, this.scratchMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.mesh.dispose();
    this.paths.clear();
    this.pulses.length = 0;
  }

  private deactivate(index: number): void {
    this.pulses[index].active = false;
    this.hide(index);
  }

  private hide(index: number): void {
    this.scratchScale.setScalar(0);
    this.scratchMatrix.compose(this.scratchPos.set(0, 0, 0), this.identityQuat, this.scratchScale);
    this.mesh.setMatrixAt(index, this.scratchMatrix);
  }
}
