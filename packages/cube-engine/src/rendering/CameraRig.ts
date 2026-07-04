import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CAMERA } from '../config/tokens';
import type { NormalizedPointer, Updatable } from '../core/types';
import { damp, dampVector3 } from '../math/damp';

export interface CameraPreset {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fov?: number;
}

/**
 * Cinematic camera system. Everything is config-driven (presets, rails) so no
 * scene ever hardcodes camera numbers (Stage 2 "Avoid hardcoded values"). Pointer
 * parallax is heavily damped — the camera acknowledges the pointer, never chases
 * it (Creative §3, §7.7). The camera never rolls.
 */
export class CameraRig implements Updatable {
  readonly camera: PerspectiveCamera;

  private readonly presets = new Map<string, CameraPreset>();
  private readonly desiredPosition = new Vector3();
  private readonly desiredTarget = new Vector3();
  private readonly currentTarget = new Vector3();
  private readonly parallax: NormalizedPointer = { x: 0, y: 0 };
  private readonly parallaxSmoothed: NormalizedPointer = { x: 0, y: 0 };
  private readonly scratch = new Vector3();

  private desiredFov: number = CAMERA.fov;
  private rail: CatmullRomCurve3 | null = null;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
    this.camera.position.set(0, 0.8, 6);
    this.desiredPosition.copy(this.camera.position);
    this.camera.lookAt(this.currentTarget);
  }

  definePreset(name: string, preset: CameraPreset): this {
    this.presets.set(name, preset);
    return this;
  }

  /** Smoothly move toward a named preset. */
  apply(name: string): void {
    const preset = this.presets.get(name);
    if (!preset) throw new Error(`[cube-engine] Unknown camera preset "${name}"`);
    this.applyPreset(preset);
  }

  applyPreset(preset: CameraPreset): void {
    this.desiredPosition.set(...preset.position);
    this.desiredTarget.set(...preset.target);
    this.desiredFov = preset.fov ?? this.desiredFov;
    this.rail = null;
  }

  /** Define a scripted camera path for future beat transitions (Stage 2 "camera rails"). */
  setRail(points: ReadonlyArray<readonly [number, number, number]>): void {
    this.rail = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  }

  /** Position along the rail in [0,1]. */
  moveAlongRail(t: number): void {
    if (!this.rail) return;
    this.rail.getPointAt(MathUtils.clamp(t, 0, 1), this.desiredPosition);
  }

  /** Fit the framing so an object of the given radius fills the view comfortably. */
  frameRadius(radius: number, fill = 1.15): void {
    const fovRad = MathUtils.degToRad(this.desiredFov);
    const distance = (radius * fill) / Math.sin(fovRad / 2);
    this.scratch.subVectors(this.desiredPosition, this.desiredTarget).normalize().multiplyScalar(distance);
    this.desiredPosition.copy(this.desiredTarget).add(this.scratch);
  }

  setPointer(pointer: NormalizedPointer): void {
    this.parallax.x = pointer.x;
    this.parallax.y = pointer.y;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(delta: number): void {
    this.parallaxSmoothed.x = damp(this.parallaxSmoothed.x, this.parallax.x, CAMERA.parallaxStiffness, delta);
    this.parallaxSmoothed.y = damp(this.parallaxSmoothed.y, this.parallax.y, CAMERA.parallaxStiffness, delta);

    const offset = MathUtils.degToRad(CAMERA.parallaxDegrees);
    this.scratch.copy(this.desiredPosition);
    this.scratch.x += this.parallaxSmoothed.x * offset;
    this.scratch.y += this.parallaxSmoothed.y * offset;

    dampVector3(this.camera.position, this.scratch, CAMERA.positionDamping, delta);
    dampVector3(this.currentTarget, this.desiredTarget, CAMERA.positionDamping, delta);

    const nextFov = damp(this.camera.fov, this.desiredFov, CAMERA.positionDamping, delta);
    if (Math.abs(nextFov - this.camera.fov) > 1e-3) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.up.set(0, 1, 0); // never roll
    this.camera.lookAt(this.currentTarget);
  }
}
