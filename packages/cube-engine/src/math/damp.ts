import { MathUtils, type Quaternion, type Vector3 } from 'three';

/**
 * Frame-rate independent exponential smoothing. `lambda` is the approach rate;
 * higher = snappier. Used everywhere instead of naive lerp so motion feels
 * identical at 30fps and 144fps (Performance §13).
 */
export function damp(current: number, target: number, lambda: number, delta: number): number {
  return MathUtils.damp(current, target, lambda, delta);
}

export function dampVector3(current: Vector3, target: Vector3, lambda: number, delta: number): Vector3 {
  current.x = MathUtils.damp(current.x, target.x, lambda, delta);
  current.y = MathUtils.damp(current.y, target.y, lambda, delta);
  current.z = MathUtils.damp(current.z, target.z, lambda, delta);
  return current;
}

/** Spring-free damped slerp toward a target orientation. */
export function dampQuaternion(current: Quaternion, target: Quaternion, lambda: number, delta: number): Quaternion {
  const alpha = 1 - Math.exp(-lambda * delta);
  return current.slerp(target, alpha);
}
