import { useEffect, useState } from 'react';
import type { EngineEventMap, EngineEventName } from '../core/EngineEvents';
import type { CubeStateName } from '../state/CubeState';
import { useCube } from './CubeProvider';

/** Subscribe a component to a strongly-typed engine event for its lifetime. */
export function useEngineEvent<K extends EngineEventName>(
  type: K,
  handler: (payload: EngineEventMap[K]) => void,
): void {
  const engine = useCube();
  useEffect(() => engine.events.on(type, handler), [engine, type, handler]);
}

/** Reactive mirror of the cube's current state, for UI that reflects it (a nav dot). */
export function useCubeState(): CubeStateName | null {
  const engine = useCube();
  const [state, setState] = useState<CubeStateName | null>(engine.stateMachine.state);
  useEffect(() => engine.events.on('CUBE_STATE_CHANGED', ({ to }) => setState(to)), [engine]);
  return state;
}
