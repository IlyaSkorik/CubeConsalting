import type { WebGLRenderer } from 'three';
import { AnimationClock } from './AnimationClock';
import { EventBus } from './EventBus';
import type { EngineEventMap } from './EngineEvents';
import type { Disposable, QualityTier, Theme } from './types';
import { ThemeManager } from '../theme/ThemeManager';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { ProceduralCube, type CubeConfig } from '../cube/ProceduralCube';
import { EnergyEngine } from '../energy/EnergyEngine';
import { ParticleEngine } from '../particles/ParticleEngine';
import { CameraRig } from '../rendering/CameraRig';
import { LightingRig } from '../rendering/LightingRig';
import { EnvironmentManager } from '../rendering/EnvironmentManager';
import { configureRenderer } from '../rendering/Renderer';
import { PerformanceManager } from '../performance/PerformanceManager';
import { QualityManager } from '../performance/QualityManager';
import { InteractionEngine } from '../interaction/InteractionEngine';
import { AssetManager } from '../assets/AssetManager';
import { ModuleRegistry } from '../state/ModuleRegistry';
import { CubeStateMachine } from '../state/CubeStateMachine';
import type { CubeModule, ModuleContext } from '../state/CubeModule';
import type { ModuleStateName } from '../state/CubeState';
import { SceneDirector } from '../scene/SceneDirector';
import { IdleModule } from '../state/modules/IdleModule';
import { AssemblyModule } from '../state/modules/AssemblyModule';
import { NetworkModule } from '../state/modules/NetworkModule';
import { GridModule } from '../state/modules/GridModule';
import { DataModule } from '../state/modules/DataModule';

export interface CubeEngineOptions {
  theme?: Theme;
  aspect?: number;
  cube?: Partial<CubeConfig>;
  autoQuality?: boolean;
  initialQuality?: QualityTier;
  dracoDecoderPath?: string;
  /** Leave the scene background/fog unset so the canvas overlays page content. */
  transparent?: boolean;
}

/**
 * Composition root. Constructs and wires every subsystem, owns the ordered update
 * step, and exposes the public engine API. It creates no visuals of its own — Hero
 * and every other consumer drive it from the outside (Stage 2 — reusable engine,
 * Hero is only the first consumer). Loop-agnostic: `frame()` advances the world;
 * a standalone runtime or the R3F binding decides when to call it and when to render.
 */
export class CubeEngine implements Disposable {
  readonly events = new EventBus<EngineEventMap>();
  readonly clock = new AnimationClock();
  readonly theme: ThemeManager;
  readonly materials: MaterialLibrary;
  readonly cube: ProceduralCube;
  readonly energy: EnergyEngine;
  readonly particles: ParticleEngine;
  readonly cameraRig: CameraRig;
  readonly lighting: LightingRig;
  readonly performance = new PerformanceManager();
  readonly quality: QualityManager;
  readonly interaction: InteractionEngine;
  readonly assets: AssetManager;
  readonly registry: ModuleRegistry;
  readonly stateMachine: CubeStateMachine;
  readonly director: SceneDirector;

  private readonly environment = new EnvironmentManager();
  private readonly autoQuality: boolean;
  private renderer: WebGLRenderer | null = null;

  constructor(options: CubeEngineOptions = {}) {
    this.autoQuality = options.autoQuality ?? true;

    this.theme = new ThemeManager(this.events, options.theme ?? 'dark');
    this.quality = new QualityManager(
      this.performance,
      this.events,
      options.initialQuality ?? QualityManager.probeInitialTier(),
    );
    this.materials = new MaterialLibrary(this.theme.preset);
    this.cube = new ProceduralCube(this.materials.core(), options.cube);
    this.energy = new EnergyEngine(this.materials.energy());
    this.particles = new ParticleEngine(this.materials.glow());
    this.cameraRig = new CameraRig(options.aspect ?? 1);
    this.lighting = new LightingRig(this.theme.preset);
    this.interaction = new InteractionEngine(this.events);
    this.assets = new AssetManager(
      options.dracoDecoderPath ? { dracoDecoderPath: options.dracoDecoderPath } : {},
    );

    this.registry = new ModuleRegistry(this.events);
    const context: ModuleContext = {
      cube: this.cube,
      materials: this.materials,
      camera: this.cameraRig,
      energy: this.energy,
      particles: this.particles,
      theme: this.theme,
      events: this.events,
    };
    this.stateMachine = new CubeStateMachine(this.registry, context, this.events);

    this.director = new SceneDirector(
      { cube: this.cube, energy: this.energy, particles: this.particles, lighting: this.lighting, environment: this.environment },
      this.stateMachine,
      this.events,
    );
    this.environment.attach(this.director.scene);
    this.environment.setTransparent(options.transparent ?? false);

    this.registerDefaultModules();
    this.wireEvents();
    this.director.applyTheme(this.theme.preset);
    this.applyQuality();
  }

  get scene() {
    return this.director.scene;
  }

  get camera() {
    return this.cameraRig.camera;
  }

  /** Register a custom cube behavior (open/closed — no engine edits required). */
  registerModule(module: CubeModule): this {
    this.registry.register(module);
    return this;
  }

  mapSection(sectionId: string, state: ModuleStateName): this {
    this.director.mapSection(sectionId, state);
    return this;
  }

  transitionTo(state: ModuleStateName): boolean {
    return this.stateMachine.transitionTo(state);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  attachInteraction(element: HTMLElement): void {
    this.interaction.attach(element);
  }

  setSize(width: number, height: number): void {
    this.cameraRig.setAspect(height > 0 ? width / height : 1);
  }

  /** Apply CUB LAB renderer settings + build the IBL environment on the given context. */
  attachRenderer(gl: WebGLRenderer): void {
    this.renderer = gl;
    configureRenderer(gl, this.theme.preset.exposure);
    this.director.buildEnvironment(gl, this.theme.preset);
    this.applyQuality();
  }

  start(initial: ModuleStateName = 'idle'): void {
    this.clock.start();
    this.stateMachine.transitionTo(initial);
  }

  /** Advance the world one frame. Does NOT render (Architecture §4 — one loop, the host renders). */
  frame(): number {
    const delta = this.clock.tick();
    const elapsed = this.clock.elapsed;
    this.performance.update(delta);
    if (this.autoQuality) this.quality.update(delta);
    this.director.update(delta, elapsed);
    this.cameraRig.update(delta);
    return delta;
  }

  dispose(): void {
    this.interaction.dispose();
    this.director.dispose();
    this.materials.dispose();
    this.assets.dispose();
    this.events.dispose();
    this.renderer = null;
  }

  private registerDefaultModules(): void {
    this.registry
      .register(new IdleModule())
      .register(new AssemblyModule())
      .register(new NetworkModule())
      .register(new GridModule())
      .register(new DataModule());
  }

  private wireEvents(): void {
    this.events.on('THEME_CHANGED', () => {
      this.materials.applyTheme(this.theme.preset);
      this.director.applyTheme(this.theme.preset);
      if (this.renderer) this.renderer.toneMappingExposure = this.theme.preset.exposure;
    });
    this.events.on('POINTER_MOVE', ({ pointer }) => this.cameraRig.setPointer(pointer));
    this.events.on('QUALITY_CHANGED', () => this.applyQuality());
  }

  private applyQuality(): void {
    const settings = this.quality.settings;
    this.lighting.setShadowQuality(settings.shadowTier);
    if (this.renderer) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
      this.renderer.setPixelRatio(Math.min(dpr, settings.maxPixelRatio));
    }
  }
}
