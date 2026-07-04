import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BufferGeometry } from 'three';
import { CUBE } from '../config/tokens';

/**
 * Procedurally generates a single cubelet geometry at runtime — no GLB, no Blender
 * (Stage 2 "Procedural Cube"). One geometry instance is shared across every cubelet
 * via InstancedMesh, so this is created exactly once per subdivision level.
 */
export function createCubeletGeometry(
  size: number = CUBE.cubeletSize,
  bevelRadius: number = CUBE.bevelRadius,
  bevelSegments: number = CUBE.bevelSegments,
): BufferGeometry {
  const radius = Math.min(bevelRadius, size / 2 - 1e-4);
  const geometry = new RoundedBoxGeometry(size, size, size, bevelSegments, radius);
  geometry.computeBoundingSphere();
  return geometry;
}
