import type { EventBus } from '../core/EventBus';
import type { EngineEventMap } from '../core/EngineEvents';
import type { Theme } from '../core/types';
import { THEME_PRESETS, type ThemePreset } from './themePresets';

/**
 * Owns the active theme and broadcasts changes. Systems (lighting, materials,
 * environment) subscribe to THEME_CHANGED and re-read their preset — theme is a
 * data swap, never a rebuild (Design System §11).
 */
export class ThemeManager {
  private current: Theme;

  constructor(private readonly events: EventBus<EngineEventMap>, initial: Theme = 'dark') {
    this.current = initial;
  }

  get theme(): Theme {
    return this.current;
  }

  get preset(): ThemePreset {
    return THEME_PRESETS[this.current];
  }

  set(theme: Theme): void {
    if (theme === this.current) return;
    this.current = theme;
    this.events.emit('THEME_CHANGED', { theme });
  }

  toggle(): void {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }
}
