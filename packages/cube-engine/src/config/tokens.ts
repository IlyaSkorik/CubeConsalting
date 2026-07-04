/**
 * Single source of truth for every design token the engine consumes.
 * Mirrors docs/architecture/01-foundation.md §11 and 02-creative-direction.md §7.
 * Values here are the LAW. No magic numbers may appear anywhere else in the engine.
 */

/** Cubic-bezier control points [x1,y1,x2,y2] from the Motion Bible §7.2. */
export const EASING = {
  standard: [0.22, 1, 0.36, 1],
  decelerate: [0.16, 1, 0.3, 1],
  accelerate: [0.7, 0, 0.84, 0],
  linear: [0, 0, 1, 1],
} as const;

export type EasingName = keyof typeof EASING;

/** Motion durations in milliseconds (Motion Bible §7.1). */
export const DURATION = {
  instant: 120,
  fast: 240,
  base: 400,
  slow: 700,
  cinematic: 1300,
  ambient: 6000,
} as const;

export type DurationName = keyof typeof DURATION;

/** The cube is a living organism — these govern its resting behavior (§7.5). */
export const BREATHING = {
  periodSeconds: 5.5,
  scaleAmplitude: 0.015,
  glowAmplitude: 0.08,
  idleRotationRadPerSec: 0.04,
  introspectionSlowdown: 0.8,
  inactivityThresholdMs: 12_000,
  reattentionMs: 300,
} as const;

/** Procedural cube generation defaults (Architecture §5, Stage 2 "Procedural Cube"). */
export const CUBE = {
  subdivisions: 3,
  cubeletSize: 1,
  gap: 0.06,
  bevelRadius: 0.08,
  bevelSegments: 4,
  scale: 1,
} as const;

/** Camera behavior (§7.7). Long lens = premium, no game-camera. */
export const CAMERA = {
  fov: 28,
  fovCalm: 24,
  fovWide: 35,
  near: 0.1,
  far: 100,
  parallaxDegrees: 2,
  parallaxPixels: 12,
  parallaxStiffness: 3.5,
  positionDamping: 4,
} as const;

/** Energy travels through structure with direction and purpose (§7.8). */
export const ENERGY = {
  pulseSpeed: 1.6,
  pulseWidth: 0.12,
  defaultIntensity: 1,
} as const;

/** Pointer parallax + interaction reaction envelopes (§3, §7.4). */
export const INTERACTION = {
  hoverLeanDegrees: 6,
  hoverBrightnessLift: 0.15,
  reactionLatencyMs: 80,
  settleMs: 500,
} as const;

/** Colors are hex integers for Three.js consumption. Electric blue on deep navy (§ Color System). */
export const PALETTE = {
  accent: 0x00d9ff,
  accentDeep: 0x0a2e6e,
  navy: 0x020817,
  graphite: 0x151b27,
  white: 0xffffff,
  lightBg: 0xf4f7fb,
  lightSurface: 0xe6edf6,
} as const;

export const SCALE_MIN = 0.0001;
