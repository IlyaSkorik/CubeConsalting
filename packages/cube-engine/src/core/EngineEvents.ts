import type { NormalizedPointer, Theme, QualityTier } from './types';
import type { CubeStateName } from '../state/CubeState';

/**
 * The complete, strongly-typed event surface of the engine (Stage 2 "Event Bus").
 * Every cross-system communication flows through here so systems stay loosely coupled.
 */
export interface EngineEventMap {
  SECTION_ENTER: { id: string };
  SECTION_EXIT: { id: string };

  POINTER_MOVE: { pointer: NormalizedPointer };
  POINTER_DOWN: { pointer: NormalizedPointer };
  POINTER_UP: { pointer: NormalizedPointer };
  CLICK: { pointer: NormalizedPointer; target?: string };

  HOVER_START: { target?: string };
  HOVER_END: { target?: string };

  FOCUS: { target?: string };
  BLUR: { target?: string };

  IDLE_START: Record<string, never>;
  IDLE_END: Record<string, never>;

  SCROLL_PROGRESS: { progress: number; velocity: number };

  THEME_CHANGED: { theme: Theme };
  QUALITY_CHANGED: { tier: QualityTier };

  CUBE_STATE_CHANGED: { from: CubeStateName | null; to: CubeStateName };

  MODULE_REGISTERED: { id: string };
  MODULE_REMOVED: { id: string };
}

export type EngineEventName = keyof EngineEventMap;
