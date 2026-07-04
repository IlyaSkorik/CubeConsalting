import { PALETTE } from '../config/tokens';
import type { Theme } from '../core/types';

export interface LightSpec {
  color: number;
  intensity: number;
}

export interface PositionedLightSpec extends LightSpec {
  position: readonly [number, number, number];
}

export interface ThemePreset {
  exposure: number;
  background: number;
  fog: { color: number; near: number; far: number };
  key: PositionedLightSpec;
  fill: LightSpec;
  accent: PositionedLightSpec & { distance: number };
  environmentIntensity: number;
  core: {
    color: number;
    metalness: number;
    roughness: number;
    emissive: number;
    emissiveIntensity: number;
  };
  glass: { color: number; transmission: number; roughness: number; thickness: number; ior: number };
  energy: { color: number; intensity: number };
}

/**
 * Both themes are intentional and equally premium (Creative Direction §THEMES).
 * Even in light theme the cube stays dark-anchored so it always commands contrast (§8).
 */
export const THEME_PRESETS: Record<Theme, ThemePreset> = {
  dark: {
    exposure: 1.2,
    background: PALETTE.navy,
    fog: { color: PALETTE.navy, near: 6, far: 22 },
    key: { color: PALETTE.white, intensity: 2.2, position: [2.5, 4, 4] },
    fill: { color: 0xcce0ff, intensity: 0.85 },
    accent: { color: PALETTE.accent, intensity: 8, position: [-1.8, 1.3, 3], distance: 25 },
    environmentIntensity: 0.6,
    core: { color: PALETTE.graphite, metalness: 0.9, roughness: 0.35, emissive: PALETTE.accentDeep, emissiveIntensity: 0.15 },
    glass: { color: 0x8fb7ff, transmission: 0.9, roughness: 0.12, thickness: 0.6, ior: 1.35 },
    energy: { color: PALETTE.accent, intensity: 1 },
  },
  light: {
    exposure: 1.05,
    background: PALETTE.lightBg,
    fog: { color: PALETTE.lightBg, near: 8, far: 26 },
    key: { color: PALETTE.white, intensity: 2.6, position: [2.5, 4.5, 4] },
    fill: { color: 0xdfeaff, intensity: 1.05 },
    accent: { color: PALETTE.accent, intensity: 5, position: [-1.8, 1.3, 3], distance: 22 },
    environmentIntensity: 0.9,
    core: { color: 0x1c2636, metalness: 0.8, roughness: 0.28, emissive: PALETTE.accentDeep, emissiveIntensity: 0.1 },
    glass: { color: 0xbcd4ff, transmission: 0.82, roughness: 0.1, thickness: 0.5, ior: 1.4 },
    energy: { color: 0x0092d6, intensity: 0.85 },
  },
};
