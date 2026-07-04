import { Scene } from 'three';
import type { EventBus } from '../core/EventBus';
import type { EngineEventMap } from '../core/EngineEvents';
import type { Disposable, Updatable } from '../core/types';
import type { ProceduralCube } from '../cube/ProceduralCube';
import type { EnergyEngine } from '../energy/EnergyEngine';
import type { ParticleEngine } from '../particles/ParticleEngine';
import type { LightingRig } from '../rendering/LightingRig';
import type { EnvironmentManager } from '../rendering/EnvironmentManager';
import type { CubeStateMachine } from '../state/CubeStateMachine';
import type { ModuleStateName } from '../state/CubeState';
import type { ThemePreset } from '../theme/themePresets';

export interface SceneContent {
  cube: ProceduralCube;
  energy: EnergyEngine;
  particles: ParticleEngine;
  lighting: LightingRig;
  environment: EnvironmentManager;
}

/**
 * Owns the scene graph and orchestrates what is on stage: it assembles the scene,
 * routes SECTION_ENTER events to cube-state transitions, drives the state machine,
 * and applies theme to lighting/environment. It does not render and it does not
 * own the camera or the loop (single responsibility — Architecture §7 SceneDirector).
 */
export class SceneDirector implements Updatable, Disposable {
  readonly scene = new Scene();

  private readonly sectionMap = new Map<string, ModuleStateName>();
  private readonly unsubscribe: () => void;

  constructor(
    private readonly content: SceneContent,
    private readonly stateMachine: CubeStateMachine,
    events: EventBus<EngineEventMap>,
  ) {
    this.scene.name = 'CubLabScene';
    this.scene.add(content.cube.object, content.energy.object, content.particles.object);
    content.lighting.attach(this.scene);

    this.unsubscribe = events.on('SECTION_ENTER', ({ id }) => {
      const state = this.sectionMap.get(id);
      if (state) this.stateMachine.transitionTo(state);
    });
  }

  /** Declare which cube state a named section drives (the cube leads — Creative §6). */
  mapSection(sectionId: string, state: ModuleStateName): this {
    this.sectionMap.set(sectionId, state);
    return this;
  }

  applyTheme(preset: ThemePreset): void {
    this.content.lighting.applyTheme(preset);
    this.content.environment.applyTheme(preset);
  }

  buildEnvironment(gl: Parameters<EnvironmentManager['buildEnvironment']>[0], preset: ThemePreset): void {
    this.content.environment.buildEnvironment(gl, preset.environmentIntensity);
  }

  update(delta: number, elapsed: number): void {
    this.stateMachine.update(delta, elapsed);
    this.content.cube.update(delta);
    this.content.energy.update(delta);
    this.content.particles.update(delta);
  }

  dispose(): void {
    this.unsubscribe();
    this.content.cube.dispose();
    this.content.energy.dispose();
    this.content.particles.dispose();
    this.content.lighting.dispose();
    this.content.environment.dispose();
  }
}
