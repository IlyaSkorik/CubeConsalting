import { DirectionalLight, Group, HemisphereLight, PointLight, type Scene } from 'three';
import { PALETTE } from '../config/tokens';
import type { Disposable } from '../core/types';
import type { ThemePreset } from '../theme/themePresets';

const SHADOW_SIZES: Record<'low' | 'medium' | 'high', number> = {
  low: 0,
  medium: 1024,
  high: 2048,
};

/**
 * Motivated, cinematic lighting (Creative §8). One key light defines edges and
 * casts shadow; a hemisphere fill keeps shadows from crushing to black; an accent
 * point light is the cube's electric-blue energy source. All values come from the
 * active theme preset — lighting is a data swap, never a rebuild.
 */
export class LightingRig implements Disposable {
  readonly group = new Group();

  private readonly key = new DirectionalLight();
  private readonly fill = new HemisphereLight();
  private readonly accent = new PointLight();

  constructor(preset: ThemePreset) {
    this.group.name = 'LightingRig';
    this.key.castShadow = true;
    this.key.shadow.bias = -0.0005;
    this.key.shadow.radius = 4;
    this.group.add(this.key, this.fill, this.accent);
    this.applyTheme(preset);
  }

  attach(scene: Scene): void {
    scene.add(this.group);
  }

  applyTheme(preset: ThemePreset): void {
    this.key.color.set(preset.key.color);
    this.key.intensity = preset.key.intensity;
    this.key.position.set(...preset.key.position);

    this.fill.color.set(preset.fill.color);
    this.fill.groundColor.set(PALETTE.graphite);
    this.fill.intensity = preset.fill.intensity;

    this.accent.color.set(preset.accent.color);
    this.accent.intensity = preset.accent.intensity;
    this.accent.distance = preset.accent.distance;
    this.accent.position.set(...preset.accent.position);
  }

  /** Fine-tune the accent (the cube's energy source) without redefining the rig.
   *  Re-apply after a theme change, which resets lights to the preset. */
  setAccentIntensity(intensity: number): void {
    this.accent.intensity = intensity;
  }

  setShadowQuality(tier: 'low' | 'medium' | 'high'): void {
    const size = SHADOW_SIZES[tier];
    this.key.castShadow = size > 0;
    if (size > 0) {
      this.key.shadow.mapSize.set(size, size);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
  }

  dispose(): void {
    this.key.shadow.map?.dispose();
    this.key.dispose();
    this.fill.dispose();
    this.accent.dispose();
    this.group.removeFromParent();
  }
}
