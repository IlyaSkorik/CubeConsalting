import type { SceneRegistry } from './SceneRegistry';
import type { SceneLifecycle, SceneListener, SceneMode, SceneSnapshot } from './types';

/** Fraction of each scene unit spent stable before crossfade to the next. */
const HOLD_RATIO = 0.72;

export interface SceneDirectorOptions {
  readonly registry: SceneRegistry;
  readonly mode: SceneMode;
  readonly reducedMotion: boolean;
}

export class SceneDirector {
  private timeline = 0;
  private lastActiveId = '';
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

  goTo(index: number, immediate = false): SceneSnapshot {
    const target = immediate
      ? index
      : this.options.reducedMotion
        ? index
        : index;
    return this.setTimeline(target);
  }

  goToId(id: string, immediate = false): SceneSnapshot | null {
    const index = this.options.registry.indexOf(id);
    if (index < 0) return null;
    return this.goTo(index, immediate);
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
      transitionProgress = (localProgress - HOLD_RATIO) / (1 - HOLD_RATIO);
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

    if (transitionProgress > 0 && fromSceneId && toSceneId) {
      this.dispatch('leaving', {
        id: fromSceneId,
        index: this.options.registry.indexOf(fromSceneId),
        progress: transitionProgress,
      });
      this.dispatch('entering', {
        id: toSceneId,
        index: this.options.registry.indexOf(toSceneId),
        progress: transitionProgress,
      });
      document.dispatchEvent(
        new CustomEvent('cub:scene-leaving', {
          detail: { id: fromSceneId, progress: transitionProgress },
        }),
      );
      document.dispatchEvent(
        new CustomEvent('cub:scene-entering', {
          detail: { id: toSceneId, progress: transitionProgress },
        }),
      );
    }

    if (activeSceneId && activeSceneId !== this.lastActiveId) {
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
