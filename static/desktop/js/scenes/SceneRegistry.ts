import type { SceneDefinition } from './types';

const SCENE_SELECTOR = '[data-scene]';

/** Canonical scene order — mirrors BEATS in landing.ts. */
export const SCENE_IDS = [
  'hero',
  'solutions',
  'case',
  'lab',
  'demo',
  'footer',
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export class SceneRegistry {
  readonly scenes: readonly SceneDefinition[];
  readonly count: number;
  readonly byId: ReadonlyMap<string, SceneDefinition>;
  readonly byIndex: ReadonlyMap<number, SceneDefinition>;

  private constructor(scenes: readonly SceneDefinition[]) {
    this.scenes = scenes;
    this.count = scenes.length;
    this.byId = new Map(scenes.map((s) => [s.id, s]));
    this.byIndex = new Map(scenes.map((s) => [s.index, s]));
  }

  static fromDOM(root: ParentNode = document): SceneRegistry | null {
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(SCENE_SELECTOR));
    if (nodes.length === 0) return null;

    const scenes: SceneDefinition[] = nodes
      .map((element) => {
        const raw = element.dataset.scene;
        const index = raw !== undefined ? Number.parseInt(raw, 10) : Number.NaN;
        const id = element.id || element.dataset.sceneId || '';
        if (!id || Number.isNaN(index)) return null;
        return { index, id, element };
      })
      .filter((s): s is SceneDefinition => s !== null)
      .sort((a, b) => a.index - b.index);

    if (scenes.length === 0) return null;
    return new SceneRegistry(scenes);
  }

  idAt(index: number): string | undefined {
    return this.byIndex.get(index)?.id;
  }

  indexOf(id: string): number {
    return this.byId.get(id)?.index ?? -1;
  }
}
