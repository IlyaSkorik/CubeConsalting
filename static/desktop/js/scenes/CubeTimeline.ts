import type { CameraPreset, CubeEngine, ModuleStateName } from '../../../../packages/cube-engine/src/index';

export interface BeatLike {
  readonly id: string;
  readonly state: ModuleStateName;
  readonly accent: number;
  readonly rest?: 'rich' | 'subtle';
  readonly camera?: CameraPreset;
}

export interface CubeTimelineOptions {
  readonly engine: CubeEngine;
  readonly beats: readonly BeatLike[];
  readonly baseAccent: number;
  readonly reducedMotion: boolean;
  readonly onSettle: (beat: BeatLike) => void;
  readonly configureRestEnergy: (subtle: boolean) => void;
}

/** Timeline-driven cube transitions between beats (Phase 4). */
export class CubeTimeline {
  private lastFromId = '';
  private appliedState: ModuleStateName | null = null;
  /** Beat whose camera/energy/accent personality is currently applied. */
  private lastPersonalityId = '';

  constructor(private readonly options: CubeTimelineOptions) {}

  scrub(fromId: string, toId: string, progress: number): void {
    const { engine, beats, baseAccent, reducedMotion, configureRestEnergy } = this.options;
    const from = beats.find((b) => b.id === fromId);
    const to = beats.find((b) => b.id === toId);

    if (!from || !to || progress <= 0) {
      if (from) this.applyBeat(from);
      return;
    }

    const t = Math.max(0, Math.min(1, progress));
    engine.lighting.setAccentIntensity(
      baseAccent * (from.accent + (to.accent - from.accent) * t),
    );

    if (!reducedMotion) {
      const fromCam = from.camera;
      const toCam = to.camera;
      if (fromCam && toCam) {
        engine.cameraRig.applyPreset(this.lerpPreset(fromCam, toCam, t));
      } else if (toCam && t > 0.5) {
        engine.cameraRig.applyPreset(toCam);
      } else if (fromCam && t <= 0.5) {
        engine.cameraRig.applyPreset(fromCam);
      }

      if (t >= 0.5 && this.appliedState !== to.state) {
        this.options.engine.transitionTo(to.state);
        this.appliedState = to.state;
        if (to.camera) this.options.engine.cameraRig.applyPreset(to.camera);
        if (to.state === 'idle') configureRestEnergy(to.rest === 'subtle');
        this.lastPersonalityId = to.id;
      }
    }

    this.lastFromId = fromId;
  }

  hold(beat: BeatLike): void {
    this.applyModule(beat);
    this.applyPersonality(beat);
  }

  /** Module transition — once per state change. */
  private applyModule(beat: BeatLike): void {
    if (this.options.reducedMotion) return;
    if (this.appliedState === beat.state) return;
    this.options.engine.transitionTo(beat.state);
    this.appliedState = beat.state;
  }

  /** Beat personality layers on top of module enter (camera, energy, accent). */
  private applyPersonality(beat: BeatLike): void {
    if (this.lastPersonalityId === beat.id) return;
    const { engine, baseAccent, reducedMotion, configureRestEnergy } = this.options;

    if (!reducedMotion) {
      if (beat.camera) engine.cameraRig.applyPreset(beat.camera);
      if (beat.state === 'idle') configureRestEnergy(beat.rest === 'subtle');
    }

    engine.lighting.setAccentIntensity(baseAccent * beat.accent);
    this.lastPersonalityId = beat.id;
  }

  private applyBeat(beat: BeatLike): void {
    this.applyModule(beat);
    this.applyPersonality(beat);
  }

  private lerpPreset(a: CameraPreset, b: CameraPreset, t: number): CameraPreset {
    const lerp = (x: number, y: number): number => x + (y - x) * t;
    return {
      position: [
        lerp(a.position[0], b.position[0]),
        lerp(a.position[1], b.position[1]),
        lerp(a.position[2], b.position[2]),
      ],
      target: [
        lerp(a.target[0], b.target[0]),
        lerp(a.target[1], b.target[1]),
        lerp(a.target[2], b.target[2]),
      ],
      fov: a.fov !== undefined && b.fov !== undefined ? lerp(a.fov, b.fov) : b.fov ?? a.fov,
    };
  }
}
