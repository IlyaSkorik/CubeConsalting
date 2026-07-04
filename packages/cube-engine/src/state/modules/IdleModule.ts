import { BREATHING, CAMERA, CUBE } from '../../config/tokens';
import type { CubeModule, ModuleContext } from '../CubeModule';

const TWO_PI = Math.PI * 2;

/**
 * The resting mind (Creative §2, §3). The cube is whole, breathing, slowly
 * rotating — never fully still. This is the cube's home pose.
 */
export class IdleModule implements CubeModule {
  readonly id = 'idle' as const;

  enter(ctx: ModuleContext): void {
    ctx.cube.object.scale.setScalar(CUBE.scale);
    ctx.cube.setDampingLambda(5);
    ctx.cube.resetToHome();
    ctx.energy.clear();
    ctx.camera.applyPreset({ position: [0, 0.8, 6], target: [0, 0, 0], fov: CAMERA.fovCalm });
  }

  exit(): void {
    // nothing to tear down; the next module owns the cube's targets
  }

  update(delta: number, elapsed: number, ctx: ModuleContext): void {
    const phase = (elapsed / BREATHING.periodSeconds) * TWO_PI;
    const breathe = 1 + Math.sin(phase) * BREATHING.scaleAmplitude;
    ctx.cube.object.scale.setScalar(CUBE.scale * breathe);
    ctx.cube.object.rotation.y += BREATHING.idleRotationRadPerSec * delta;
  }
}
