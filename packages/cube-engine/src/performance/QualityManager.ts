import type { EventBus } from '../core/EventBus';
import type { EngineEventMap } from '../core/EngineEvents';
import type { QualityTier, Updatable } from '../core/types';
import type { PerformanceManager } from './PerformanceManager';

export interface QualitySettings {
  maxPixelRatio: number;
  shadowTier: 'low' | 'medium' | 'high';
  particleScale: number;
  energyEnabled: boolean;
}

const TIER_ORDER: QualityTier[] = ['low', 'medium', 'high', 'ultra'];

const TIER_SETTINGS: Record<QualityTier, QualitySettings> = {
  low: { maxPixelRatio: 1, shadowTier: 'low', particleScale: 0.25, energyEnabled: false },
  medium: { maxPixelRatio: 1.5, shadowTier: 'medium', particleScale: 0.6, energyEnabled: true },
  high: { maxPixelRatio: 2, shadowTier: 'high', particleScale: 1, energyEnabled: true },
  ultra: { maxPixelRatio: 2, shadowTier: 'high', particleScale: 1.5, energyEnabled: true },
};

const DOWNGRADE_FPS = 45;
const UPGRADE_FPS = 58;
const COOLDOWN_SECONDS = 3;

/**
 * Adapts fidelity to sustained performance with hysteresis + cooldown so quality
 * never oscillates. The experience degrades, it never breaks (Performance §13).
 * Initial tier is probed from device capabilities and prefers-reduced-motion.
 */
export class QualityManager implements Updatable {
  private tierIndex: number;
  private cooldown = 0;

  constructor(
    private readonly performance: PerformanceManager,
    private readonly events: EventBus<EngineEventMap>,
    initialTier: QualityTier = 'high',
  ) {
    this.tierIndex = TIER_ORDER.indexOf(initialTier);
  }

  static probeInitialTier(): QualityTier {
    if (typeof window === 'undefined') return 'high';
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'low';
    const cores = navigator.hardwareConcurrency ?? 4;
    const dpr = window.devicePixelRatio ?? 1;
    if (cores <= 4 && dpr > 2) return 'low';
    if (cores <= 4) return 'medium';
    if (cores >= 8 && dpr <= 2) return 'high';
    return 'high';
  }

  get tier(): QualityTier {
    return TIER_ORDER[this.tierIndex];
  }

  get settings(): QualitySettings {
    return TIER_SETTINGS[this.tier];
  }

  setTier(tier: QualityTier): void {
    const index = TIER_ORDER.indexOf(tier);
    if (index === -1 || index === this.tierIndex) return;
    this.tierIndex = index;
    this.events.emit('QUALITY_CHANGED', { tier: this.tier });
  }

  update(delta: number): void {
    if (this.cooldown > 0) {
      this.cooldown -= delta;
      return;
    }
    const fps = this.performance.fps;
    if (fps < DOWNGRADE_FPS && this.tierIndex > 0) {
      this.tierIndex--;
      this.cooldown = COOLDOWN_SECONDS;
      this.events.emit('QUALITY_CHANGED', { tier: this.tier });
    } else if (fps > UPGRADE_FPS && this.tierIndex < TIER_ORDER.length - 2) {
      // cap auto-upgrades at 'high'; 'ultra' is opt-in only
      this.tierIndex++;
      this.cooldown = COOLDOWN_SECONDS;
      this.events.emit('QUALITY_CHANGED', { tier: this.tier });
    }
  }
}
