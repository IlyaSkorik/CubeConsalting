import type { SceneDirector } from './SceneDirector';
import { timelineFromScrollY } from './SceneDirector';
import type { SceneRegistry } from './SceneRegistry';
import type { SceneMode } from './types';

export interface ScrollDriverOptions {
  readonly registry: SceneRegistry;
  readonly director: SceneDirector;
  readonly track: HTMLElement;
  readonly mode: SceneMode;
  readonly reducedMotion: boolean;
}

export class ScrollDriver {
  private programmatic = false;
  private viewportHeight = 0;
  private wheelLocked = false;

  constructor(private readonly options: ScrollDriverOptions) {}

  mount(): void {
    this.syncTrackHeight();
    this.viewportHeight = window.innerHeight;
    this.options.director.setTimeline(this.readTimeline());

    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
  }

  /** Called from the landing RAF loop — no separate animation frame. */
  tick(): void {
    if (this.options.mode === 'cinema') {
      this.options.director.setTimeline(this.readTimeline());
    }
  }

  unmount(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  goToId(id: string, immediate = false): void {
    const index = this.options.registry.indexOf(id);
    if (index < 0) return;
    this.goToIndex(index, immediate);
  }

  goToIndex(index: number, immediate = false): void {
    this.programmatic = true;
    if (this.options.mode === 'passive') {
      const el = this.options.registry.byIndex.get(index)?.element;
      if (el) {
        const top = el.offsetTop;
        window.scrollTo({
          top,
          behavior: immediate || this.options.reducedMotion ? ('instant' as ScrollBehavior) : 'smooth',
        });
      }
    } else {
      const vh = window.innerHeight;
      const targetY = index * vh;
      window.scrollTo({
        top: targetY,
        behavior: immediate || this.options.reducedMotion ? ('instant' as ScrollBehavior) : 'smooth',
      });
    }
    this.options.director.goTo(index, immediate || this.options.reducedMotion);
    window.setTimeout(() => {
      this.programmatic = false;
    }, immediate ? 0 : 800);
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

  private onScroll = (): void => {
    if (this.programmatic) return;
    this.options.director.setTimeline(this.readTimeline());
  };

  private onResize = (): void => {
    this.viewportHeight = window.innerHeight;
    this.syncTrackHeight();
    this.options.director.setTimeline(this.readTimeline());
  };

  private onWheel = (event: WheelEvent): void => {
    if (this.options.mode !== 'cinema' || this.options.reducedMotion) return;
    if (this.wheelLocked) {
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
    this.wheelLocked = true;
    this.goToIndex(next);
    window.setTimeout(() => {
      this.wheelLocked = false;
    }, 900);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const snap = this.options.director.snapshot;
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
