import type { Updatable } from '../core/types';

/**
 * Passive frame-timing monitor. Maintains a rolling average FPS that the
 * QualityManager consumes to adapt fidelity. It measures; it never mutates the
 * scene (single responsibility).
 */
export class PerformanceManager implements Updatable {
  private readonly window: number;
  private readonly samples: number[] = [];
  private accumulator = 0;
  private _fps = 60;

  constructor(sampleWindow = 60) {
    this.window = sampleWindow;
  }

  get fps(): number {
    return this._fps;
  }

  get averageFrameMs(): number {
    return this._fps > 0 ? 1000 / this._fps : 0;
  }

  update(delta: number): void {
    if (delta <= 0) return;
    const instantaneous = 1 / delta;
    this.samples.push(instantaneous);
    this.accumulator += instantaneous;
    if (this.samples.length > this.window) {
      this.accumulator -= this.samples.shift() ?? 0;
    }
    this._fps = this.accumulator / this.samples.length;
  }
}
