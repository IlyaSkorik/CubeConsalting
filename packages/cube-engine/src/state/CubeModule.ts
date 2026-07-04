import type { ProceduralCube } from '../cube/ProceduralCube';
import type { MaterialLibrary } from '../materials/MaterialLibrary';
import type { CameraRig } from '../rendering/CameraRig';
import type { EnergyEngine } from '../energy/EnergyEngine';
import type { ParticleEngine } from '../particles/ParticleEngine';
import type { ThemeManager } from '../theme/ThemeManager';
import type { EventBus } from '../core/EventBus';
import type { EngineEventMap } from '../core/EngineEvents';
import type { ModuleStateName } from './CubeState';

/**
 * Everything a module is allowed to touch. Modules manipulate cube targets and
 * request camera/energy behavior — they never reach into the renderer or the DOM
 * (Architecture §5 — modules are pure state → visual mappers).
 */
export interface ModuleContext {
  readonly cube: ProceduralCube;
  readonly materials: MaterialLibrary;
  readonly camera: CameraRig;
  readonly energy: EnergyEngine;
  readonly particles: ParticleEngine;
  readonly theme: ThemeManager;
  readonly events: EventBus<EngineEventMap>;
}

/**
 * A behavior the one cube can express. Adding a new module (a new section) means
 * adding a file and registering it — never editing existing modules (open/closed).
 */
export interface CubeModule {
  readonly id: ModuleStateName;
  enter(ctx: ModuleContext): void;
  exit(ctx: ModuleContext): void;
  update(delta: number, elapsed: number, ctx: ModuleContext): void;
}
