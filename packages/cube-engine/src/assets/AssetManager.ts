import { TextureLoader, type Object3D, type Texture } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { Disposable } from '../core/types';

export interface AssetManagerOptions {
  /** URL of the Draco decoder directory for compressed decorative GLBs. */
  dracoDecoderPath?: string;
}

/**
 * Caches and disposes external assets. The PRIMARY cube is procedural and never
 * loaded here (Stage 2). This exists for future decorative/environment GLBs and
 * textures — loaded once, cached, and released on dispose to prevent GPU leaks.
 */
export class AssetManager implements Disposable {
  private readonly gltfLoader: GLTFLoader;
  private readonly textureLoader = new TextureLoader();
  private readonly dracoLoader: DRACOLoader | null = null;

  private readonly gltfCache = new Map<string, Promise<GLTF>>();
  private readonly textureCache = new Map<string, Texture>();

  constructor(options: AssetManagerOptions = {}) {
    this.gltfLoader = new GLTFLoader();
    if (options.dracoDecoderPath) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(options.dracoDecoderPath);
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }
  }

  loadGLTF(url: string): Promise<GLTF> {
    let promise = this.gltfCache.get(url);
    if (!promise) {
      promise = this.gltfLoader.loadAsync(url);
      this.gltfCache.set(url, promise);
    }
    return promise;
  }

  loadTexture(url: string): Texture {
    let texture = this.textureCache.get(url);
    if (!texture) {
      texture = this.textureLoader.load(url);
      this.textureCache.set(url, texture);
    }
    return texture;
  }

  dispose(): void {
    for (const texture of this.textureCache.values()) texture.dispose();
    this.textureCache.clear();
    for (const promise of this.gltfCache.values()) {
      promise.then((gltf) => disposeObject(gltf.scene)).catch(() => undefined);
    }
    this.gltfCache.clear();
    this.dracoLoader?.dispose();
  }
}

function disposeObject(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as { geometry?: { dispose(): void }; material?: unknown };
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => (m as { dispose?(): void }).dispose?.());
    else (material as { dispose?(): void } | undefined)?.dispose?.();
  });
}
