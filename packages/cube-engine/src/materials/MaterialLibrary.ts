import {
  AdditiveBlending,
  Color,
  Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three';
import type { Disposable } from '../core/types';
import type { ThemePreset } from '../theme/themePresets';

/** Factory contract for future custom/shader materials (Stage 2 "Future Shader Material interface"). */
export interface MaterialFactory {
  create(preset: ThemePreset): Material;
  applyTheme?(material: Material, preset: ThemePreset): void;
}

type BuiltinKey = 'core' | 'glass' | 'metal' | 'energy' | 'glow';

/**
 * The one place materials are created. Every consumer shares these instances so
 * we never duplicate GPU programs (Stage 2 "Never duplicate materials").
 * Theme changes mutate the cached materials in place — no rebuild, no reallocation.
 */
export class MaterialLibrary implements Disposable {
  private readonly builtins = new Map<BuiltinKey, Material>();
  private readonly custom = new Map<string, { material: Material; factory: MaterialFactory }>();

  constructor(private preset: ThemePreset) {}

  core(): MeshStandardMaterial {
    return this.getBuiltin('core', () => {
      const c = this.preset.core;
      return new MeshStandardMaterial({
        color: new Color(c.color),
        metalness: c.metalness,
        roughness: c.roughness,
        emissive: new Color(c.emissive),
        emissiveIntensity: c.emissiveIntensity,
      });
    }) as MeshStandardMaterial;
  }

  glass(): MeshPhysicalMaterial {
    return this.getBuiltin('glass', () => {
      const g = this.preset.glass;
      return new MeshPhysicalMaterial({
        color: new Color(g.color),
        transmission: g.transmission,
        roughness: g.roughness,
        thickness: g.thickness,
        ior: g.ior,
        transparent: true,
        metalness: 0,
      });
    }) as MeshPhysicalMaterial;
  }

  metal(): MeshStandardMaterial {
    return this.getBuiltin('metal', () =>
      new MeshStandardMaterial({ color: new Color(this.preset.core.color), metalness: 1, roughness: 0.18 }),
    ) as MeshStandardMaterial;
  }

  energy(): MeshBasicMaterial {
    return this.getBuiltin('energy', () =>
      new MeshBasicMaterial({
        color: new Color(this.preset.energy.color),
        transparent: true,
        blending: AdditiveBlending,
        toneMapped: false,
        depthWrite: false,
      }),
    ) as MeshBasicMaterial;
  }

  glow(): MeshBasicMaterial {
    return this.getBuiltin('glow', () =>
      new MeshBasicMaterial({
        color: new Color(this.preset.energy.color),
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        toneMapped: false,
        depthWrite: false,
      }),
    ) as MeshBasicMaterial;
  }

  register(id: string, factory: MaterialFactory): Material {
    let entry = this.custom.get(id);
    if (!entry) {
      entry = { material: factory.create(this.preset), factory };
      this.custom.set(id, entry);
    }
    return entry.material;
  }

  get(id: string): Material | undefined {
    return this.custom.get(id)?.material;
  }

  applyTheme(preset: ThemePreset): void {
    this.preset = preset;
    this.updateStandard('core', preset.core.color, preset.core.emissive, preset.core.emissiveIntensity);
    this.updateStandard('metal', preset.core.color);
    const glass = this.builtins.get('glass') as MeshPhysicalMaterial | undefined;
    if (glass) {
      glass.color.set(preset.glass.color);
      glass.transmission = preset.glass.transmission;
      glass.roughness = preset.glass.roughness;
    }
    (this.builtins.get('energy') as MeshBasicMaterial | undefined)?.color.set(preset.energy.color);
    (this.builtins.get('glow') as MeshBasicMaterial | undefined)?.color.set(preset.energy.color);
    for (const { material, factory } of this.custom.values()) {
      factory.applyTheme?.(material, preset);
    }
  }

  dispose(): void {
    for (const material of this.builtins.values()) material.dispose();
    for (const { material } of this.custom.values()) material.dispose();
    this.builtins.clear();
    this.custom.clear();
  }

  private getBuiltin(key: BuiltinKey, create: () => Material): Material {
    let material = this.builtins.get(key);
    if (!material) {
      material = create();
      this.builtins.set(key, material);
    }
    return material;
  }

  private updateStandard(key: BuiltinKey, color: number, emissive?: number, emissiveIntensity?: number): void {
    const material = this.builtins.get(key) as MeshStandardMaterial | undefined;
    if (!material) return;
    material.color.set(color);
    if (emissive !== undefined) material.emissive.set(emissive);
    if (emissiveIntensity !== undefined) material.emissiveIntensity = emissiveIntensity;
  }
}
