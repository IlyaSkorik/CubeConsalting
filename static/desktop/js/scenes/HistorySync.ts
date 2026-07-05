import type { SceneDirector } from './SceneDirector';
import type { SceneRegistry } from './SceneRegistry';

export interface HistorySyncOptions {
  readonly registry: SceneRegistry;
  readonly director: SceneDirector;
  readonly scrollGoTo: (id: string, immediate?: boolean) => void;
}

export class HistorySync {
  private enabled = false;

  constructor(private readonly options: HistorySyncOptions) {}

  mount(): void {
    this.enabled = true;
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const index = this.options.registry.indexOf(hash);
      if (index >= 0) {
        this.options.scrollGoTo(hash, true);
      }
    } else {
      this.syncHash(this.options.director.snapshot.activeSceneId, true);
    }

    window.addEventListener('popstate', this.onPopState);
    this.options.director.on('active', ({ id }) => {
      this.syncHash(id, false);
    });
  }

  unmount(): void {
    this.enabled = false;
    window.removeEventListener('popstate', this.onPopState);
  }

  private syncHash(id: string, replace: boolean): void {
    if (!this.enabled) return;
    const hash = `#${id}`;
    if (window.location.hash === hash) return;
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    if (replace) {
      history.replaceState({ sceneId: id }, '', url);
    } else {
      history.replaceState({ sceneId: id }, '', url);
    }
  }

  private onPopState = (): void => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    if (this.options.registry.indexOf(hash) >= 0) {
      this.options.scrollGoTo(hash, true);
    }
  };
}
