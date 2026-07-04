import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { CubeEngine, type CubeEngineOptions } from '../core/CubeEngine';

const CubeContext = createContext<CubeEngine | null>(null);

export interface CubeProviderProps {
  options?: CubeEngineOptions;
  /** Provide an externally-owned engine instead of creating one. */
  engine?: CubeEngine;
  children: ReactNode;
}

/**
 * Owns the engine's lifetime and exposes it to the tree via context, so any DOM
 * component (a nav dot, a CTA) can request cube behavior through useCube() without
 * touching Three.js (Architecture §5 — provider + hook, never a direct import).
 */
export function CubeProvider({ options, engine, children }: CubeProviderProps) {
  const instance = useMemo(() => engine ?? new CubeEngine(options), [engine, options]);

  useEffect(() => {
    if (engine) return; // externally owned — do not dispose here
    return () => instance.dispose();
  }, [engine, instance]);

  return <CubeContext.Provider value={instance}>{children}</CubeContext.Provider>;
}

export function useCube(): CubeEngine {
  const engine = useContext(CubeContext);
  if (!engine) throw new Error('useCube must be used within a <CubeProvider>.');
  return engine;
}
