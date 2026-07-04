import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, type CSSProperties } from 'react';
import type { CubeEngine } from '../core/CubeEngine';
import type { ModuleStateName } from '../state/CubeState';
import { useCube } from './CubeProvider';

interface StageProps {
  engine: CubeEngine;
  initial: ModuleStateName;
}

/**
 * Bridges the engine to R3F. Using a positive useFrame priority disables R3F's
 * automatic render, so the engine renders its own scene with its own CameraRig
 * camera — one loop, one clock, exactly as the standalone runtime does.
 */
function CubeStage({ engine, initial }: StageProps): null {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  useEffect(() => {
    engine.attachRenderer(gl);
    engine.attachInteraction(gl.domElement);
    engine.start(initial);
  }, [engine, gl, initial]);

  useEffect(() => {
    engine.setSize(size.width, size.height);
  }, [engine, size.width, size.height]);

  useFrame(() => {
    engine.frame();
    gl.render(engine.scene, engine.camera);
  }, 1);

  return null;
}

export interface CubeCanvasProps {
  initial?: ModuleStateName;
  className?: string;
  style?: CSSProperties;
}

/**
 * The single persistent WebGL canvas the whole platform shares (Architecture §4).
 * Must be rendered inside a <CubeProvider>. It is deliberately client-only —
 * mount it via `next/dynamic({ ssr: false })` (Architecture §13, R9).
 */
export function CubeCanvas({ initial = 'idle', className, style }: CubeCanvasProps) {
  const engine = useCube();
  return (
    <Canvas
      className={className}
      style={style}
      frameloop="always"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <CubeStage engine={engine} initial={initial} />
    </Canvas>
  );
}
