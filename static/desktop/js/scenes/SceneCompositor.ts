import type { SceneRegistry } from './SceneRegistry';
import type { SceneSnapshot } from './types';

export class SceneCompositor {
  private readonly scenes: readonly { id: string; element: HTMLElement }[];

  constructor(registry: SceneRegistry) {
    this.scenes = registry.scenes;
  }

  /** Phase 1 passive — mark scenes, no layout change. */
  applyPassive(snapshot: SceneSnapshot): void {
    for (const scene of this.scenes) {
      const isActive = scene.id === snapshot.activeSceneId;
      scene.element.dataset.sceneState = isActive ? 'active' : 'idle';
    }
  }

  /** Phase 3 cinema — fixed layers, one dominant scene, cinematic crossfade. */
  applyCinema(snapshot: SceneSnapshot): void {
    const { activeSceneId, fromSceneId, toSceneId, transitionProgress } = snapshot;

    for (const scene of this.scenes) {
      const el = scene.element;
      let opacity = 0;
      let state: string = 'idle';
      let pointer = false;
      let hidden = true;

      if (transitionProgress > 0 && fromSceneId && toSceneId) {
        if (scene.id === fromSceneId) {
          state = 'leaving';
          opacity = 1 - transitionProgress;
          pointer = transitionProgress < 0.5;
          hidden = opacity < 0.02;
        } else if (scene.id === toSceneId) {
          state = 'entering';
          opacity = transitionProgress;
          pointer = transitionProgress >= 0.5;
          hidden = opacity < 0.02;
        }
      } else if (scene.id === activeSceneId) {
        state = 'active';
        opacity = 1;
        pointer = true;
        hidden = false;
      }

      el.classList.toggle('is-active', state === 'active');
      el.classList.toggle('is-entering', state === 'entering');
      el.classList.toggle('is-leaving', state === 'leaving');
      el.dataset.sceneState = state;
      el.style.setProperty('--scene-opacity', opacity.toFixed(4));
      el.style.opacity = snapshot.mode === 'cinema' ? String(opacity) : '';
      el.style.pointerEvents = pointer ? 'auto' : 'none';
      el.toggleAttribute('inert', hidden);
      el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    }
  }

  apply(snapshot: SceneSnapshot): void {
    if (snapshot.mode === 'cinema') this.applyCinema(snapshot);
    else this.applyPassive(snapshot);
  }

  reset(): void {
    for (const scene of this.scenes) {
      const el = scene.element;
      el.classList.remove('is-active', 'is-entering', 'is-leaving');
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
      el.style.removeProperty('--scene-opacity');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
      delete el.dataset.sceneState;
    }
  }
}
