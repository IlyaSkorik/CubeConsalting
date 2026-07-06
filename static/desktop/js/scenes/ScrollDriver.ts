import type { SceneDirector } from './SceneDirector';
import { timelineFromScrollY } from './SceneDirector';
import type { SceneRegistry } from './SceneRegistry';
import type { SceneMode } from './types';
import { easeInOutCubic } from './easing';

/** Duration of one discrete scene advance (wheel, nav, keyboard). */
const SCENE_ADVANCE_MS = 850;

export interface ScrollDriverOptions {
  readonly registry: SceneRegistry;
  readonly director: SceneDirector;
  readonly track: HTMLElement;
  readonly mode: SceneMode;
  readonly reducedMotion: boolean;
}

export class ScrollDriver {
  private programmatic = false;
  private animating = false;
  private animRaf = 0;
  private snapTimer = 0;
  private viewportHeight = 0;

  constructor(private readonly options: ScrollDriverOptions) {}

  get isAnimating(): boolean {
    return this.animating;
  }

  mount(): void {
    this.syncTrackHeight();
    this.viewportHeight = window.innerHeight;
    this.options.director.setTimeline(this.readTimeline());

    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', this.onScrollEnd);
    }
  }

  /** Called from the landing RAF loop — sync scroll drift only when idle. */
  tick(): void {
    if (this.options.mode !== 'cinema') return;
    if (this.animating || this.programmatic) return;
    this.options.director.setTimeline(this.readTimeline());
  }

  unmount(): void {
    cancelAnimationFrame(this.animRaf);
    window.clearTimeout(this.snapTimer);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('scrollend', this.onScrollEnd);
  }

  goToId(id: string, immediate = false): void {
    const index = this.options.registry.indexOf(id);
    if (index < 0) return;
    this.goToIndex(index, immediate);
  }

  goToIndex(index: number, immediate = false): void {
    const max = this.options.registry.count - 1;
    const target = Math.max(0, Math.min(max, index));

    if (this.options.mode === 'passive') {
      this.goToIndexPassive(target, immediate);
      return;
    }

    if (immediate || this.options.reducedMotion) {
      this.cancelAnimation();
      this.snapToTimeline(target);
      return;
    }

    this.animateToIndex(target);
  }

  private goToIndexPassive(index: number, immediate: boolean): void {
    const el = this.options.registry.byIndex.get(index)?.element;
    if (!el) return;
    this.programmatic = true;
    window.scrollTo({
      top: el.offsetTop,
      behavior: immediate || this.options.reducedMotion ? ('instant' as ScrollBehavior) : 'smooth',
    });
    this.options.director.goTo(index);
    window.setTimeout(() => {
      this.programmatic = false;
    }, immediate ? 0 : 800);
  }

  private animateToIndex(targetIndex: number): void {
    if (this.animating) return;

    const from = this.options.director.snapshot.timeline;
    const to = targetIndex;
    if (Math.abs(to - from) < 0.001) return;

    this.cancelAnimation();
    this.animating = true;
    this.programmatic = true;

    const vh = this.viewportHeight || window.innerHeight;
    const startMs = performance.now();

    const frame = (now: number): void => {
      const linear = Math.min(1, (now - startMs) / SCENE_ADVANCE_MS);
      const eased = easeInOutCubic(linear);
      const timeline = from + (to - from) * eased;

      this.options.director.setTimeline(timeline);
      window.scrollTo(0, timeline * vh);

      if (linear < 1) {
        this.animRaf = requestAnimationFrame(frame);
      } else {
        this.snapToTimeline(to);
        this.animating = false;
        this.programmatic = false;
      }
    };

    this.animRaf = requestAnimationFrame(frame);
  }

  private snapToTimeline(index: number): void {
    const vh = this.viewportHeight || window.innerHeight;
    window.scrollTo(0, index * vh);
    this.options.director.goTo(index);
  }

  private cancelAnimation(): void {
    cancelAnimationFrame(this.animRaf);
    this.animRaf = 0;
    this.animating = false;
  }

  private readTimeline(): number {
    const vh = this.viewportHeight || window.innerHeight;
    if (this.options.mode === 'cinema') {
      return window.scrollY / Math.max(1, vh);
    }
    return timelineFromScrollY(this.options.registry, window.scrollY, vh);
  }

  private syncTrackHeight(): void {
    const count = this.options.registry.count;
    const track = this.options.track;
    track.replaceChildren();
    if (this.options.mode === 'cinema') {
      for (let i = 0; i < count; i++) {
        const page = document.createElement('div');
        page.className = 'scroll-snap-page';
        page.setAttribute('aria-hidden', 'true');
        track.appendChild(page);
      }
      document.documentElement.style.setProperty('--scene-count', String(count));
    }
  }

  private scheduleSnapCheck(): void {
    window.clearTimeout(this.snapTimer);
    this.snapTimer = window.setTimeout(() => this.correctDrift(), 150);
  }

  /** Pull free scroll back to the nearest settled scene — no mid-crossfade rest. */
  private correctDrift(): void {
    if (this.animating || this.programmatic || this.options.mode !== 'cinema') return;

    const t = this.readTimeline();
    const max = this.options.registry.count - 1;
    const nearest = Math.max(0, Math.min(max, Math.round(t)));

    if (Math.abs(t - nearest) > 0.04) {
      this.animateToIndex(nearest);
    } else if (Math.abs(t - nearest) > 0.001) {
      this.snapToTimeline(nearest);
    }
  }

  private onScroll = (): void => {
    if (this.programmatic || this.animating) return;
    this.options.director.setTimeline(this.readTimeline());
    if (this.options.mode === 'cinema') {
      this.scheduleSnapCheck();
    }
  };

  private onScrollEnd = (): void => {
    this.correctDrift();
  };

  private onResize = (): void => {
    this.viewportHeight = window.innerHeight;
    this.syncTrackHeight();
    if (!this.animating) {
      const idx = this.options.director.snapshot.sceneIndex;
      this.snapToTimeline(idx);
    }
  };

  private onWheel = (event: WheelEvent): void => {
    if (this.options.mode !== 'cinema' || this.options.reducedMotion) return;

    if (this.animating) {
      event.preventDefault();
      return;
    }

    const delta = event.deltaY;
    if (Math.abs(delta) < 8) return;

    const snap = this.options.director.snapshot;
    const idx = snap.sceneIndex;
    const max = this.options.registry.count - 1;
    const inTransition = snap.transitionProgress > 0.02;

    if (inTransition) {
      event.preventDefault();
      return;
    }

    const next = delta > 0 ? Math.min(max, idx + 1) : Math.max(0, idx - 1);
    if (next === idx) return;

    event.preventDefault();
    this.animateToIndex(next);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const snap = this.options.director.snapshot;
    if (snap.transitionProgress > 0.02 || this.animating) return;

    const idx = snap.sceneIndex;
    const max = this.options.registry.count - 1;
    let next = -1;

    switch (event.key) {
      case 'PageDown':
      case 'ArrowDown':
        next = Math.min(max, idx + 1);
        break;
      case 'PageUp':
      case 'ArrowUp':
        next = Math.max(0, idx - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }

    if (next === idx) return;
    event.preventDefault();
    this.goToIndex(next, this.options.reducedMotion);
  };
}
