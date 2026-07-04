import { Vector3 } from 'three';
import { CAMERA, CUBE } from '../../config/tokens';
import type { CubeModule, ModuleContext } from '../CubeModule';

const RADIUS = 3.2;
const GOLDEN_ANGLE = 2.399963229728653;
const CONNECTION_COUNT = 12;

/**
 * The platform reaching out (Creative §2, Beat 2/6). The cube expands into a field
 * of connected nodes on a Fibonacci sphere; energy streams from the core outward
 * along a subset of connections.
 */
export class NetworkModule implements CubeModule {
  readonly id = 'network' as const;
  private readonly node = new Vector3();
  private pathIds: string[] = [];

  enter(ctx: ModuleContext): void {
    ctx.cube.object.scale.setScalar(CUBE.scale);
    ctx.cube.object.rotation.set(0, 0, 0);
    ctx.cube.setDampingLambda(3);

    const n = ctx.cube.cubelets.length;
    for (let i = 0; i < n; i++) {
      const c = ctx.cube.cubelets[i];
      const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * GOLDEN_ANGLE;
      this.node.set(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(RADIUS);
      c.targetPosition.copy(this.node);
      c.targetScale.setScalar(0.55);
      c.targetQuaternion.identity();
    }

    ctx.energy.clear();
    this.pathIds = [];
    const step = Math.max(1, Math.floor(n / CONNECTION_COUNT));
    for (let i = 0; i < n; i += step) {
      const c = ctx.cube.cubelets[i];
      const id = `network-${i}`;
      ctx.energy.addPath(id, [[0, 0, 0], [c.targetPosition.x, c.targetPosition.y, c.targetPosition.z]]);
      ctx.energy.emitPulse(id, { loop: true, intensity: 1 });
      this.pathIds.push(id);
    }
    ctx.camera.applyPreset({ position: [0, 1.2, 8], target: [0, 0, 0], fov: CAMERA.fovWide });
  }

  exit(ctx: ModuleContext): void {
    for (const id of this.pathIds) ctx.energy.removePath(id);
    this.pathIds = [];
  }

  update(): void {
    // node drift and pulses are self-sustaining via damping + looping energy
  }
}
