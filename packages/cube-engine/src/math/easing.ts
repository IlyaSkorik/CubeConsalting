import { EASING } from '../config/tokens';
import type { EasingName } from '../config/tokens';

export type EasingFn = (t: number) => number;

const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 1e-7;
const SUBDIVISION_MAX_ITERATIONS = 10;

function a(c1: number, c2: number): number { return 1 - 3 * c2 + 3 * c1; }
function b(c1: number, c2: number): number { return 3 * c2 - 6 * c1; }
function c(c1: number): number { return 3 * c1; }

function bezier(t: number, c1: number, c2: number): number {
  return ((a(c1, c2) * t + b(c1, c2)) * t + c(c1)) * t;
}

function slope(t: number, c1: number, c2: number): number {
  return 3 * a(c1, c2) * t * t + 2 * b(c1, c2) * t + c(c1);
}

function solveT(x: number, x1: number, x2: number): number {
  let t = x;
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const currentSlope = slope(t, x1, x2);
    if (currentSlope < NEWTON_MIN_SLOPE) break;
    t -= (bezier(t, x1, x2) - x) / currentSlope;
  }
  let lower = 0;
  let upper = 1;
  t = x;
  for (let i = 0; i < SUBDIVISION_MAX_ITERATIONS; i++) {
    const value = bezier(t, x1, x2) - x;
    if (Math.abs(value) < SUBDIVISION_PRECISION) return t;
    if (value > 0) upper = t;
    else lower = t;
    t = (lower + upper) / 2;
  }
  return t;
}

/** Build a reusable easing function from cubic-bezier control points. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  if (x1 === y1 && x2 === y2) return (t) => t;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return bezier(solveT(t, x1, x2), y1, y2);
  };
}

const cache = new Map<EasingName, EasingFn>();

/** Resolve one of the named Motion Bible curves, memoized. */
export function easing(name: EasingName): EasingFn {
  let fn = cache.get(name);
  if (!fn) {
    const [x1, y1, x2, y2] = EASING[name];
    fn = cubicBezier(x1, y1, x2, y2);
    cache.set(name, fn);
  }
  return fn;
}
