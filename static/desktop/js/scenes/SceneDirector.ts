import type { SceneRegistry } from './SceneRegistry';
import type { SceneLifecycle, SceneListener, SceneMode, SceneSnapshot } from './types';
import { easeInOutCubic } from './easing';

/** Stable hold before crossfade — tuned for discrete scene advances (~850ms total). */
const HOLD_RATIO = 0.5;

export interface SceneDirectorOptions {
  readonly registry: SceneRegistry;
  readonly mode: SceneMode;
  readonly reducedMotion: boolean;
}

export class SceneDirector {
  private timeline = 0;
  private lastActiveId = '';
  private lastTransitionActive = false;
  private enterCounts = new Map<string, number>();
  private listeners = new Map<string, Set<(detail: unknown) => void>>();

  constructor(private readonly options: SceneDirectorOptions) {}

  get snapshot(): SceneSnapshot {
    return this.compute(this.timeline);
  }

  get mode(): SceneMode {
    return this.options.mode;
  }

  setTimeline(value: number): SceneSnapshot {
    const max = Math.max(0, this.options.registry.count - 1);
    const clamped =
      this.options.mode === 'cinema' && !this.options.reducedMotion
        ? Math.max(0, Math.min(max + 0.999, value))
        : Math.max(0, Math.min(max, value));
    this.timeline = clamped;
    const snap = this.compute(clamped);
    this.emitTick(snap);
    this.emitLifecycle(snap);
    return snap;
  }

  goTo(index: number): SceneSnapshot {
    return this.setTimeline(index);
  }

  goToId(id: string): SceneSnapshot | null {
    const index = this.options.registry.indexOf(id);
    if (index < 0) return null;
    return this.goTo(index);
  }

  on<K extends keyof import('./types').SceneEventMap>(
    event: K,
    fn: SceneListener<K>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as (detail: unknown) => void);
    return () => set!.delete(fn as (detail: unknown) => void);
  }

  private compute(timeline: number): SceneSnapshot {
    const { registry, mode } = this.options;
    const count = registry.count;
    const maxIndex = count - 1;
    const clampedIndex = Math.min(maxIndex, Math.max(0, Math.floor(timeline)));
    const localProgress = timeline - clampedIndex;

    let transitionProgress = 0;
    let lifecycle: SceneLifecycle = 'active';
    let fromSceneId: string | null = null;
    let toSceneId: string | null = null;

    if (
      mode === 'cinema' &&
      clampedIndex < maxIndex &&
      localProgress > HOLD_RATIO
    ) {
      const raw = (localProgress - HOLD_RATIO) / (1 - HOLD_RATIO);
      transitionProgress = easeInOutCubic(Math.max(0, Math.min(1, raw)));
      lifecycle = 'leaving';
      fromSceneId = registry.idAt(clampedIndex) ?? null;
      toSceneId = registry.idAt(clampedIndex + 1) ?? null;
    } else if (localProgress > 0 && clampedIndex < maxIndex && mode === 'passive') {
      transitionProgress = localProgress;
      lifecycle = localProgress < 0.5 ? 'leaving' : 'entering';
      fromSceneId = registry.idAt(clampedIndex) ?? null;
      toSceneId = registry.idAt(clampedIndex + 1) ?? null;
    } else {
      lifecycle = 'active';
    }

    const activeSceneId = registry.idAt(clampedIndex) ?? '';

    return {
      timeline,
      sceneIndex: clampedIndex,
      localProgress,
      transitionProgress,
      activeSceneId,
      fromSceneId,
      toSceneId,
      lifecycle,
      mode,
    };
  }

  private emitTick(snap: SceneSnapshot): void {
    this.dispatch('tick', snap);
    document.dispatchEvent(new CustomEvent('cub:scene-tick', { detail: snap }));
  }

  private emitLifecycle(snap: SceneSnapshot): void {
    const { activeSceneId, transitionProgress, fromSceneId, toSceneId } = snap;
    const inTransition =
      transitionProgress > 0 && fromSceneId !== null && toSceneId !== null;

    if (inTransition && !this.lastTransitionActive) {
      const leavePayload = {
        id: fromSceneId,
        index: this.options.registry.indexOf(fromSceneId),
        progress: 0,
      };
      const enterPayload = {
        id: toSceneId,
        index: this.options.registry.indexOf(toSceneId),
        progress: 0,
      };
      this.dispatch('leaving', leavePayload);
      this.dispatch('entering', enterPayload);
      document.dispatchEvent(
        new CustomEvent('cub:scene-leaving', { detail: { id: fromSceneId, progress: 0 } }),
      );
      document.dispatchEvent(
        new CustomEvent('cub:scene-entering', { detail: { id: toSceneId, progress: 0 } }),
      );
    }

    this.lastTransitionActive = inTransition;

    // Settled scene — only when fully on an integer timeline (not mid-crossfade).
    const settled =
      !inTransition &&
      Math.abs(snap.timeline - Math.round(snap.timeline)) < 0.001;

    if (settled && activeSceneId && activeSceneId !== this.lastActiveId) {
      this.lastActiveId = activeSceneId;
      const enterCount = (this.enterCounts.get(activeSceneId) ?? 0) + 1;
      this.enterCounts.set(activeSceneId, enterCount);
      const payload = {
        id: activeSceneId,
        index: snap.sceneIndex,
        enterCount,
      };
      this.dispatch('active', payload);
      document.dispatchEvent(new CustomEvent('cub:scene-active', { detail: payload }));
    }
  }

  private dispatch(event: string, detail: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) fn(detail);
  }
}

export function timelineFromScrollY(
  registry: SceneRegistry,
  scrollY: number,
  viewportHeight: number,
): number {
  if (viewportHeight <= 0) return 0;
  const scenes = registry.scenes;
  if (scenes.length === 0) return 0;

  const y = scrollY + viewportHeight * 0.08;
  for (let i = scenes.length - 1; i >= 0; i--) {
    const top = scenes[i].element.offsetTop;
    if (y >= top) {
      const next = scenes[i + 1];
      if (!next) return i;
      const span = Math.max(1, next.element.offsetTop - top);
      const local = Math.max(0, Math.min(1, (y - top) / span));
      return i + local;
    }
  }
  return 0;
}
