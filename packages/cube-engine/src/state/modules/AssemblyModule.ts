import { Vector3 } from 'three';
import { CAMERA, CUBE } from '../../config/tokens';
import { hash01, hash2 } from '../../math/hash';
import type { CubeModule, ModuleContext } from '../CubeModule';

const SCATTER_RADIUS = 6;

/**
 * Creation — order from chaos (Creative §2, Beat 7). Cubelets begin scattered and
 * converge into the whole cube. Scatter directions are deterministic (hashed by
 * index) so the assembly is reproducible frame-for-frame.
 */
export class AssemblyModule implements CubeModule {
  readonly id = 'assembly' as const;
  private readonly dir = new Vector3();

  enter(ctx: ModuleContext): void {
    ctx.cube.object.scale.setScalar(CUBE.scale);
    ctx.cube.object.rotation.set(0, 0, 0);
    ctx.cube.setDampingLambda(4);
    ctx.energy.clear();

    for (const c of ctx.cube.cubelets) {
      const [a, b] = hash2(c.index);
      this.dir.set(a - 0.5, b - 0.5, hash01(c.index * 7) - 0.5).normalize();
      c.position.copy(c.home).addScaledVector(this.dir, SCATTER_RADIUS * (0.5 + a));
      c.scale.setScalar(0.2);
      c.quaternion.identity();
      c.targetPosition.copy(c.home);
      c.targetQuaternion.identity();
      c.targetScale.setScalar(1);
    }
    ctx.camera.applyPreset({ position: [0, 0.6, 6.5], target: [0, 0, 0], fov: CAMERA.fov });
  }

  exit(): void {
    // converged; leave cubelets at home for the next module
  }

  update(): void {
    // convergence is driven entirely by the cube's damping toward home targets
  }
}
