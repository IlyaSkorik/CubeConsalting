/** Scene lifecycle — a scene is entering, active, leaving, or off-screen. */
export type SceneLifecycle = 'idle' | 'entering' | 'active' | 'leaving';

/** How the scroll track maps to the timeline (phased rollout). */
export type SceneMode = 'passive' | 'cinema';

export interface SceneDefinition {
  readonly index: number;
  readonly id: string;
  readonly element: HTMLElement;
}

/** Single frame snapshot — the contract every consumer reads. */
export interface SceneSnapshot {
  readonly timeline: number;
  readonly sceneIndex: number;
  readonly localProgress: number;
  /** 0 = stable on sceneIndex; (0,1] = crossfade toward sceneIndex + 1 */
  readonly transitionProgress: number;
  readonly activeSceneId: string;
  readonly fromSceneId: string | null;
  readonly toSceneId: string | null;
  readonly lifecycle: SceneLifecycle;
  readonly mode: SceneMode;
}

export type SceneEventMap = {
  tick: SceneSnapshot;
  active: { id: string; index: number; enterCount: number };
  entering: { id: string; index: number; progress: number };
  leaving: { id: string; index: number; progress: number };
};

export type SceneListener<K extends keyof SceneEventMap> = (
  detail: SceneEventMap[K],
) => void;
