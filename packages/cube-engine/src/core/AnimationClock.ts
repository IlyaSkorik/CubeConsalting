import { Clock } from 'three';

const MAX_DELTA = 1 / 20; // clamp huge frames after tab refocus so nothing "jumps"

/**
 * The single time source for the engine. Delta is clamped so a stalled tab does
 * not produce a physics explosion on the next frame. The engine owns one clock;
 * every system reads time from it (Architecture §4 — one RAF loop, one clock).
 */
export class AnimationClock {
  private readonly clock = new Clock(false);
  private lastDelta = 0;
  private elapsedTime = 0;

  start(): void {
    this.clock.start();
  }

  stop(): void {
    this.clock.stop();
  }

  /** Advance one frame. Returns the clamped delta in seconds. */
  tick(): number {
    const raw = this.clock.getDelta();
    this.lastDelta = Math.min(raw, MAX_DELTA);
    this.elapsedTime += this.lastDelta;
    return this.lastDelta;
  }

  get delta(): number {
    return this.lastDelta;
  }

  get elapsed(): number {
    return this.elapsedTime;
  }
}
