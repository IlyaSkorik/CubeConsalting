import { Color, Fog, PMREMGenerator, type Scene, type Texture, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Disposable } from '../core/types';
import type { ThemePreset } from '../theme/themePresets';

/**
 * Owns scene background, fog and the image-based-lighting environment that gives
 * the cube its soft edge reflections (Creative §8). The PMREM env map is generated
 * procedurally from a RoomEnvironment — no HDRI asset to download.
 */
export class EnvironmentManager implements Disposable {
  private envMap: Texture | null = null;
  private scene: Scene | null = null;
  private transparent = false;
  private readonly background = new Color();

  /** Bind to the scene owned by the SceneDirector (avoids a construction cycle). */
  attach(scene: Scene): void {
    this.scene = scene;
  }

  /**
   * Transparent mode leaves the scene background and fog unset so the canvas can
   * overlay page content (e.g. the Hero over its section). IBL reflections are
   * unaffected. Must be set before applyTheme.
   */
  setTransparent(value: boolean): void {
    this.transparent = value;
  }

  /** Generate the IBL environment once; call after a renderer exists. */
  buildEnvironment(gl: WebGLRenderer, intensity: number): void {
    if (this.envMap || !this.scene) return;
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    this.envMap = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = intensity;
    room.dispose();
    pmrem.dispose();
  }

  applyTheme(preset: ThemePreset): void {
    if (!this.scene) return;
    if (this.transparent) {
      this.scene.background = null;
      this.scene.fog = null;
    } else {
      this.background.set(preset.background);
      this.scene.background = this.background;
      this.scene.fog = new Fog(preset.fog.color, preset.fog.near, preset.fog.far);
    }
    this.scene.environmentIntensity = preset.environmentIntensity;
  }

  dispose(): void {
    this.envMap?.dispose();
    this.envMap = null;
    if (this.scene) this.scene.environment = null;
  }
}
