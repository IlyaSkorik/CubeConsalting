/**
 * @cublab/cube-engine — public API.
 * Framework-agnostic core only. React Three Fiber bindings live at `@cublab/cube-engine/react`.
 */

// Composition root
export { CubeEngine } from './core/CubeEngine';
export type { CubeEngineOptions } from './core/CubeEngine';

// Core primitives
export { EventBus } from './core/EventBus';
export type { EventListener } from './core/EventBus';
export type { EngineEventMap, EngineEventName } from './core/EngineEvents';
export { AnimationClock } from './core/AnimationClock';
export type { Theme, QualityTier, Updatable, Disposable, NormalizedPointer, Size } from './core/types';

// Config tokens (the law — single source of truth)
export {
  EASING,
  DURATION,
  BREATHING,
  CUBE,
  CAMERA,
  ENERGY,
  INTERACTION,
  PALETTE,
  SCALE_MIN,
} from './config/tokens';
export type { EasingName, DurationName } from './config/tokens';

// Procedural cube
export { ProceduralCube } from './cube/ProceduralCube';
export type { CubeConfig, Cubelet, GridCoord } from './cube/ProceduralCube';
export { createCubeletGeometry } from './cube/CubeletGeometry';

// State machine + modules
export { StateMachine } from './state/StateMachine';
export type { StateHandler, StateChangeListener } from './state/StateMachine';
export { ModuleRegistry } from './state/ModuleRegistry';
export { CubeStateMachine } from './state/CubeStateMachine';
export { CUBE_STATES } from './state/CubeState';
export type { CubeStateName, ModuleStateName } from './state/CubeState';
export type { CubeModule, ModuleContext } from './state/CubeModule';
export { IdleModule } from './state/modules/IdleModule';
export { AssemblyModule } from './state/modules/AssemblyModule';
export { NetworkModule } from './state/modules/NetworkModule';
export { GridModule } from './state/modules/GridModule';
export { DataModule } from './state/modules/DataModule';

// Materials
export { MaterialLibrary } from './materials/MaterialLibrary';
export type { MaterialFactory } from './materials/MaterialLibrary';

// Energy + particles
export { EnergyEngine } from './energy/EnergyEngine';
export type { PulseOptions } from './energy/EnergyEngine';
export { ParticleEngine } from './particles/ParticleEngine';
export type { ParticleSpec, EmitterSpec } from './particles/ParticleEngine';

// Rendering
export { Renderer, configureRenderer } from './rendering/Renderer';
export { CameraRig } from './rendering/CameraRig';
export type { CameraPreset } from './rendering/CameraRig';
export { LightingRig } from './rendering/LightingRig';
export { EnvironmentManager } from './rendering/EnvironmentManager';
export { StandaloneRuntime } from './rendering/StandaloneRuntime';
export type { StandaloneRuntimeOptions } from './rendering/StandaloneRuntime';

// Performance
export { PerformanceManager } from './performance/PerformanceManager';
export { QualityManager } from './performance/QualityManager';
export type { QualitySettings } from './performance/QualityManager';

// Interaction
export { InteractionEngine } from './interaction/InteractionEngine';

// Theme
export { ThemeManager } from './theme/ThemeManager';
export { THEME_PRESETS } from './theme/themePresets';
export type { ThemePreset, LightSpec, PositionedLightSpec } from './theme/themePresets';

// Assets
export { AssetManager } from './assets/AssetManager';
export type { AssetManagerOptions } from './assets/AssetManager';

// Scene
export { SceneDirector } from './scene/SceneDirector';
export type { SceneContent } from './scene/SceneDirector';

// Math
export { easing, cubicBezier } from './math/easing';
export type { EasingFn } from './math/easing';
export { damp, dampVector3, dampQuaternion } from './math/damp';
