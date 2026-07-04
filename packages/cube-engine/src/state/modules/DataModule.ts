import { CAMERA, CUBE } from '../../config/tokens';
import type { Cubelet } from '../../cube/ProceduralCube';
import type { CubeModule, ModuleContext } from '../CubeModule';

const WAVE_SPEED = 1.4;
const WAVE_SCALE = 0.45;
const BASE_HEIGHT = 0.6;

/**
 * The platform reasoning over information (Creative §2, Beat 4). The cube stays in
 * its home lattice but its surface becomes a living data topography — cubelets
 * rise and fall like values updating in place. Expressed in the blue-on-navy
 * system, never a rainbow.
 */
export class DataModule implements CubeModule {
  readonly id = 'data' as const;

  enter(ctx: ModuleContext): void {
    ctx.cube.object.scale.setScalar(CUBE.scale);
    ctx.cube.object.rotation.set(0, 0, 0);
    ctx.cube.setDampingLambda(7);
    ctx.cube.resetToHome();
    ctx.energy.clear();
    ctx.camera.applyPreset({ position: [0, 2.4, 6], target: [0, 0, 0], fov: CAMERA.fov });
  }

  exit(ctx: ModuleContext): void {
    ctx.cube.resetToHome();
  }

  update(_delta: number, elapsed: number, ctx: ModuleContext): void {
    for (const c of ctx.cube.cubelets) {
      if (!ctx.cube.isSurface(c)) continue;
      c.targetScale.y = this.height(c, elapsed);
    }
  }

  private height(c: Cubelet, elapsed: number): number {
    const wave = Math.sin(c.grid.x * 0.9 + c.grid.z * 0.7 + elapsed * WAVE_SPEED);
    return BASE_HEIGHT + (wave * 0.5 + 0.5) * WAVE_SCALE;
  }
}
