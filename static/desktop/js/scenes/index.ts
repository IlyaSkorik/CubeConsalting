import type { CubeEngine } from '../../../../packages/cube-engine/src/index';
import { CubeTimeline, type BeatLike } from './CubeTimeline';
import { HistorySync } from './HistorySync';
import { SceneCompositor } from './SceneCompositor';
import { SceneDirector } from './SceneDirector';
import { SceneRegistry } from './SceneRegistry';
import { ScrollDriver } from './ScrollDriver';
import type { SceneMode, SceneSnapshot } from './types';

export interface SceneSystemOptions {
  readonly beats: readonly BeatLike[];
  readonly engine?: CubeEngine;
  readonly baseAccent?: number;
  readonly reducedMotion: boolean;
  readonly configureRestEnergy?: (subtle: boolean) => void;
  readonly onBeatSettle?: (beat: BeatLike) => void;
  /** passive = Phase 1–2 legacy layout; cinema = fixed scenes + virtual track */
  readonly mode?: SceneMode;
}

export interface SceneSystem {
  readonly director: SceneDirector;
  readonly scroll: ScrollDriver;
  readonly registry: SceneRegistry;
  readonly compositor: SceneCompositor;
  readonly cubeTimeline: CubeTimeline | null;
  dispose(): void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function bootSceneSystem(options: SceneSystemOptions): SceneSystem | null {
  const track = document.getElementById('scroll-track');
  const registry = SceneRegistry.fromDOM();
  if (!registry || !track) {
    console.warn('[scenes] Missing [data-scene] sections or #scroll-track');
    return null;
  }

  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const mode: SceneMode =
    options.mode ?? (reducedMotion ? 'passive' : 'cinema');

  document.documentElement.dataset.sceneMode = mode;

  const director = new SceneDirector({ registry, mode, reducedMotion });
  const compositor = new SceneCompositor(registry);
  const scroll = new ScrollDriver({
    registry,
    director,
    track,
    mode,
    reducedMotion,
  });

  let cubeTimeline: CubeTimeline | null = null;
  if (options.engine && options.baseAccent !== undefined && options.configureRestEnergy) {
    cubeTimeline = new CubeTimeline({
      engine: options.engine,
      beats: options.beats,
      baseAccent: options.baseAccent,
      reducedMotion,
      configureRestEnergy: options.configureRestEnergy,
      onSettle: options.onBeatSettle ?? (() => {}),
    });
  }

  const applySnapshot = (snap: SceneSnapshot): void => {
    compositor.apply(snap);
    if (cubeTimeline) {
      if (snap.transitionProgress > 0 && snap.fromSceneId && snap.toSceneId) {
        cubeTimeline.scrub(snap.fromSceneId, snap.toSceneId, snap.transitionProgress);
      } else {
        const beat = options.beats.find((b) => b.id === snap.activeSceneId);
        if (beat) cubeTimeline.hold(beat);
      }
    }
  };

  director.on('tick', applySnapshot);

  director.on('active', ({ id }) => {
    const beat = options.beats.find((b) => b.id === id);
    if (beat) options.onBeatSettle?.(beat);
    revealSceneContent(registry.byId.get(id)?.element);
  });

  director.on('leaving', ({ id }) => {
    hideSceneContent(registry.byId.get(id)?.element);
  });

  scroll.mount();

  const history = new HistorySync({
    registry,
    director,
    scrollGoTo: (id, immediate) => scroll.goToId(id, immediate),
  });
  history.mount();

  (window as unknown as { __sceneScroll: ScrollDriver }).__sceneScroll = scroll;

  applySnapshot(director.snapshot);

  return {
    director,
    scroll,
    registry,
    compositor,
    cubeTimeline,
    dispose: () => {
      history.unmount();
      scroll.unmount();
      compositor.reset();
      delete (window as unknown as { __sceneScroll?: ScrollDriver }).__sceneScroll;
      delete document.documentElement.dataset.sceneMode;
    },
  };
}

function revealSceneContent(root?: HTMLElement): void {
  if (!root) return;
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    el.classList.add('is-revealed');
  });
}

function hideSceneContent(root?: HTMLElement): void {
  if (!root) return;
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    el.classList.remove('is-revealed');
  });
}

export { SceneRegistry, SceneDirector, SceneCompositor, ScrollDriver, HistorySync, CubeTimeline };
export type { SceneSnapshot, SceneMode, SceneLifecycle } from './types';
