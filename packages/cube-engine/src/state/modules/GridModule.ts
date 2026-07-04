import { CAMERA, CUBE } from '../../config/tokens';
import type { CubeModule, ModuleContext } from '../CubeModule';

const CELL = 1.1;
const PATH_ID = 'grid-flow';

/**
 * The platform's modules laid out, and workflows executing across them (Creative
 * §2, Beat 3). Cubelets tile into an ordered grid; a single energy pulse travels
 * the cells in sequence — a process running by itself.
 */
export class GridModule implements CubeModule {
  readonly id = 'grid' as const;

  enter(ctx: ModuleContext): void {
    ctx.cube.object.scale.setScalar(CUBE.scale);
    ctx.cube.object.rotation.set(0, 0, 0);
    ctx.cube.setDampingLambda(4);

    const n = ctx.cube.cubelets.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const offsetX = ((cols - 1) * CELL) / 2;
    const offsetY = ((rows - 1) * CELL) / 2;

    const cells: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const c = ctx.cube.cubelets[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * CELL - offsetX;
      const y = offsetY - row * CELL;
      c.targetPosition.set(x, y, 0);
      c.targetScale.setScalar(0.8);
      c.targetQuaternion.identity();
      cells.push([x, y, 0]);
    }

    ctx.energy.clear();
    if (cells.length > 1) {
      ctx.energy.addPath(PATH_ID, cells);
      ctx.energy.emitPulse(PATH_ID, { loop: true, speed: 0.4 });
    }
    ctx.camera.applyPreset({ position: [0, 0, 9], target: [0, 0, 0], fov: CAMERA.fov });
  }

  exit(ctx: ModuleContext): void {
    ctx.energy.removePath(PATH_ID);
  }

  update(): void {
    // sequential flow is carried by the looping pulse along the grid path
  }
}
