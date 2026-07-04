# CUB LAB — Rendering Engine

**Stage 3 — `@cublab/cube-engine` architecture**
Internal engineering document · Owner: Frontend Architecture · Status: Implemented

---

## 0. What this document is

This describes the **Cube Engine exactly as it is implemented** in
`packages/cube-engine/`. It is the reference for anyone extending the engine or
building a new host. It follows two prior documents that remain the law:

- `01-foundation.md` — product/technical architecture and the migration story.
- `02-creative-direction.md` — the **Motion Bible**. Every timing, easing, camera
  and behavioural decision in the engine traces back to it. **Do not invent motion
  values in code — add them to `config/tokens.ts` and cite the Motion Bible.**

The engine renders exactly one thing: **the cube** — a single living procedural
object that transforms through a finite set of states. It is framework-agnostic:
the same engine drives the vanilla Django site today and can drive a React Three
Fiber host later, unchanged.

---

## 1. First principles (non-negotiable)

1. **One of everything.** One WebGL context, one scene, one camera, one clock, one
   update loop, one cube, one material library, one energy system. Duplicating any
   of these is the single most serious defect you can introduce.
2. **The engine owns the world; the host owns the loop.** `CubeEngine.frame()`
   advances simulation but never renders. A *runtime* (standalone RAF loop or R3F)
   decides when to call `frame()` and when to draw.
3. **Tokens are the law.** All magic numbers live in `config/tokens.ts`. Modules,
   rigs and materials read tokens; they never hardcode.
4. **Open/closed.** New behaviour is added by registering a `CubeModule`, not by
   editing the state machine or the engine.
5. **Data-swap, never rebuild.** Theme changes re-apply presets to existing lights
   and materials. Nothing is torn down and recreated per interaction.

---

## 2. Package layout

```
packages/cube-engine/
├── package.json          @cublab/cube-engine · exports "." and "./react"
├── tsconfig.json         strict, verbatimModuleSyntax, isolatedModules
└── src/
    ├── index.ts          public API barrel (the ONLY supported surface)
    ├── config/
    │   └── tokens.ts      EASING, DURATION, BREATHING, CUBE, CAMERA, ENERGY,
    │                      INTERACTION, PALETTE, SCALE_MIN  ← the law
    ├── core/
    │   ├── CubeEngine.ts      composition root
    │   ├── EventBus.ts        typed pub/sub  EventBus<M extends object>
    │   ├── EngineEvents.ts    EngineEventMap (all event names + payloads)
    │   ├── AnimationClock.ts  delta/elapsed time
    │   └── types.ts           Theme, QualityTier, Updatable, Disposable, …
    ├── cube/
    │   ├── ProceduralCube.ts   InstancedMesh of N³ cubelets + damping
    │   └── CubeletGeometry.ts  RoundedBox geometry factory
    ├── state/
    │   ├── StateMachine.ts     generic FSM
    │   ├── CubeState.ts        CubeStateName / ModuleStateName
    │   ├── CubeModule.ts       CubeModule + ModuleContext interfaces
    │   ├── ModuleRegistry.ts   name → module
    │   ├── CubeStateMachine.ts drives enter/exit/update on modules
    │   └── modules/            Idle · Assembly · Network · Grid · Data
    ├── materials/
    │   └── MaterialLibrary.ts  core/glass/metal/energy/glow (+ theme apply)
    ├── energy/
    │   └── EnergyEngine.ts     pooled instanced pulses along CatmullRom paths
    ├── particles/
    │   └── ParticleEngine.ts   pooled instanced particles
    ├── rendering/
    │   ├── Renderer.ts             configureRenderer() + Renderer class
    │   ├── CameraRig.ts            presets, rails, damped parallax, never rolls
    │   ├── LightingRig.ts          key + hemisphere fill + accent point light
    │   ├── EnvironmentManager.ts   IBL + transparent-mode support
    │   └── StandaloneRuntime.ts    vanilla host: owns RAF + resize
    ├── performance/
    │   ├── PerformanceManager.ts   FPS sampling
    │   └── QualityManager.ts       adaptive tiers (DPR, shadows)
    ├── interaction/
    │   └── InteractionEngine.ts    pointer/hover → normalized events
    ├── theme/
    │   ├── ThemeManager.ts         current theme + THEME_CHANGED
    │   └── themePresets.ts         per-theme light/material/exposure values
    ├── scene/
    │   └── SceneDirector.ts        owns the Scene graph, routes sections→states
    ├── assets/
    │   └── AssetManager.ts         GLTF/Draco loading (optional)
    ├── math/
    │   ├── easing.ts   cubicBezier(), named EASING fns
    │   ├── damp.ts     frame-rate-independent damping
    │   └── hash.ts     deterministic pseudo-random
    └── react/          OPTIONAL R3F bindings (CubeProvider, CubeCanvas, hooks)
```

**Import rule:** consumers import only from `@cublab/cube-engine` (`src/index.ts`)
or `@cublab/cube-engine/react`. Reaching into deep paths is unsupported and will
break. The Django site imports the barrel via a relative path and esbuild bundles
it (see `04-landing-experience.md`).

---

## 3. Composition & data flow

`CubeEngine` is the composition root. It constructs every subsystem, wires the
events, and exposes the public API. It creates **no visuals of its own** —
consumers drive it.

```
                         ┌───────────────────────────────┐
   host (StandaloneRuntime│  or R3F CubeCanvas)           │
   owns RAF + WebGL       │                               │
        │ frame()         ▼                               │
        │        ┌──────────────────┐                     │
        └───────▶│    CubeEngine    │  (composition root) │
                 └───────┬──────────┘                     │
      ┌──────────────────┼───────────────────────────┐    │
      ▼                  ▼                            ▼    │
 ┌─────────┐      ┌─────────────┐              ┌──────────┴──┐
 │ Theme   │      │ SceneDirector│──owns──────▶│  three.Scene │
 │ Manager │      │  (scene graph│             └──────────────┘
 └────┬────┘      │  + section   │      ┌───────────────┐
      │           │   routing)   │─────▶│ CubeStateMachine│
      │ presets   └──────┬───────┘      └───────┬────────┘
      ▼                  │ update(dt,t)         │ enter/exit/update
 ┌─────────────┐         ▼                      ▼
 │MaterialLib  │   ┌───────────┐        ┌───────────────┐
 │Lighting/Env │   │ Procedural│        │  CubeModule[]  │
 └─────────────┘   │   Cube    │        │ idle/assembly/ │
                   │ Energy    │        │ network/grid/  │
                   │ Particles │        │ data           │
                   └───────────┘        └───────────────┘
```

### The frame step (ordered, deterministic)

`CubeEngine.frame()` runs each host tick and returns `delta`:

1. `clock.tick()` → `delta`, `elapsed`
2. `performance.update(delta)` — FPS sample
3. `quality.update(delta)` — may emit `QUALITY_CHANGED` (adaptive)
4. `director.update(delta, elapsed)` →
   `stateMachine.update` → active module `.update` → `cube/energy/particles.update`
5. `cameraRig.update(delta)` — damped move toward desired pose + parallax

The host then calls `renderer.render(engine.scene, engine.camera)`. **`frame()`
never renders** — this is what lets two different hosts reuse the identical engine.

---

## 4. The cube (`ProceduralCube`)

- One `THREE.InstancedMesh` of `subdivisions³` cubelets (default 3³ = 27), built
  from a shared `RoundedBoxGeometry` and the `core` material. No GLB, fully
  procedural.
- Each `Cubelet` carries `home`, `position/quaternion/scale` and
  `targetPosition/targetQuaternion/targetScale`. Modules write the *targets*;
  `ProceduralCube.update(delta)` damps the live transform toward them
  (frame-rate-independent via `math/damp`). This is why transitions are smooth and
  reversible — you never set final positions directly, you set intent.
- `setDampingLambda(n)` tunes responsiveness per state (idle is slack, data is
  snappy). `resetToHome()` restores the solid lattice. `isSurface(cubelet)`
  identifies outer-shell cubelets (used by `DataModule`).

---

## 5. State machine & modules

The cube's form is a finite state: `idle · assembly · network · grid · data`
(`ModuleStateName`), plus an internal `transition`. Each state is backed by a
`CubeModule`:

```ts
interface CubeModule {
  readonly id: ModuleStateName;
  enter(ctx: ModuleContext): void;   // set cube targets, energy, camera preset
  exit(ctx: ModuleContext): void;    // remove what enter() added
  update(delta: number, elapsed: number, ctx: ModuleContext): void;
}
```

`ModuleContext` hands a module everything it may touch: `cube, materials, camera,
energy, particles, theme, events`. A module is **self-contained**: on `enter` it
sets cubelet targets, calls `energy.clear()` and adds its own paths, and applies
its own camera preset; on `exit` it removes its paths. This is the contract that
keeps the journey reversible and leak-free.

The five shipped modules (each cites the Motion Bible beat):

| Module | Form | Camera | Energy |
|---|---|---|---|
| `IdleModule` | solid lattice, breathing + slow Y-rotation | calm, `[0,0.8,6]`, `fovCalm` | none (host adds resting energy) |
| `AssemblyModule` | cubelets converge into one perfect cube | — | convergence |
| `NetworkModule` | cubelets fan onto a Fibonacci sphere | wide, `[0,1.2,8]`, `fovWide` | core→node connection pulses |
| `GridModule` | cubelets tile into an ordered grid | front, `[0,0,9]` | one pulse walking the cells |
| `DataModule` | surface cubelets rise/fall as a data topography | elevated, `[0,2.4,6]` | none (motion is the surface) |

### Adding a new state/module (the ONLY way to add cube behaviour)

1. Add the name to `ModuleStateName` in `state/CubeState.ts`.
2. Create `state/modules/YourModule.ts` implementing `CubeModule`. In `enter`:
   - set `ctx.cube.object.scale/rotation` and each cubelet's `target*`
   - `ctx.energy.clear()` then add your own paths + `emitPulse`
   - `ctx.camera.applyPreset({ position, target, fov })` using `CAMERA` tokens
   - in `exit`, `removePath` everything you added
3. Register it in `CubeEngine.registerDefaultModules()` **or** from the consumer
   via `engine.registerModule(new YourModule())` (open/closed — no engine edit
   needed if you register from outside).
4. Export it from `index.ts` if it should be part of the public API.
5. Never read `performance.now()`/`Math.random()` for motion — derive from
   `elapsed` and `math/hash` so behaviour is deterministic and testable.

---

## 6. Energy & particles (pooled, shared)

- **`EnergyEngine`** — `addPath(id, points)` builds a `CatmullRom` curve;
  `emitPulse(id, {speed, intensity, loop})` sends a pooled instanced pulse along
  it; `removePath(id)` / `clear()` tear down. Pulses are instanced and pooled — no
  per-pulse geometry allocation. Modules and the host share the one instance; call
  `clear()` before re-arming to stay idempotent.
- **`ParticleEngine`** — pooled instanced particles with `spawn/burst/addEmitter`.

Both draw with materials from the single `MaterialLibrary` (`energy()`, `glow()`),
so colours follow the theme automatically.

---

## 7. Rendering subsystems

- **`Renderer` / `configureRenderer(gl, exposure)`** — applies CUB LAB renderer
  settings (tone mapping, color space, exposure). The host owns the `WebGLRenderer`
  and hands it to `engine.attachRenderer(gl)`, which also builds the IBL
  environment.
- **`CameraRig`** — long-lens, cinematic. `definePreset/apply`, `applyPreset`,
  `setRail/moveAlongRail`, `frameRadius`. Pointer parallax is **heavily damped**
  (`CAMERA.parallaxStiffness`) — the camera *acknowledges* the pointer, never
  chases it — and **never rolls** (`up` is re-pinned every frame). All framing
  numbers come from `CAMERA` tokens.
- **`LightingRig`** — one key `DirectionalLight` (shadow), one `HemisphereLight`
  fill, one accent `PointLight` (the cube's energy source). `applyTheme(preset)`
  swaps values; `setAccentIntensity(n)` fine-tunes the accent without a rebuild;
  `setShadowQuality(tier)` responds to the QualityManager.
- **`EnvironmentManager`** — builds IBL; `setTransparent(true)` leaves
  scene background/fog unset so the canvas can overlay page content (this is how
  the landing page shows the cube *through* sections).
- **`StandaloneRuntime`** — the reference vanilla host. Owns the RAF loop and a
  `ResizeObserver`. Options: `{ canvas?, interactionTarget? }` — render into an
  existing canvas and read pointer from a different element (used because the
  landing canvas is `pointer-events:none`).

---

## 8. Theme, performance, interaction, events

- **`ThemeManager` + `themePresets.ts`** — `'dark' | 'light'`. `set(theme)` emits
  `THEME_CHANGED`; the engine re-applies materials, lighting, environment and
  exposure. Presets hold light colours/intensities/positions, material colours and
  tone-mapping exposure per theme.
- **`QualityManager`** — probes an initial tier and adapts (max DPR, shadow tier)
  from sampled FPS, emitting `QUALITY_CHANGED`. Honour it; don't set DPR yourself.
- **`InteractionEngine`** — attaches to a DOM element and normalizes pointer/hover
  into engine events (`POINTER_MOVE`, `HOVER_START/END`, `CLICK`, …).
- **`EventBus<EngineEventMap>`** — strongly typed. Key events: `SECTION_ENTER/EXIT`,
  `POINTER_MOVE`, `HOVER_START/END`, `THEME_CHANGED`, `QUALITY_CHANGED`,
  `CUBE_STATE_CHANGED`, `MODULE_REGISTERED/REMOVED`. Subscribe with
  `engine.events.on(type, handler)`; it returns an unsubscribe function.

---

## 9. Public API cheat-sheet (from `index.ts`)

```ts
const engine = new CubeEngine({ theme, aspect, cube, autoQuality,
                                initialQuality, dracoDecoderPath, transparent });

engine.transitionTo('network');           // drive the one cube
engine.mapSection('solutions', 'network'); // section id → state (SceneDirector)
engine.registerModule(new MyModule());     // open/closed extension
engine.setTheme('light');
engine.events.on('CUBE_STATE_CHANGED', ({ to }) => { … });

engine.energy.addPath('id', [[x,y,z], …]);
engine.energy.emitPulse('id', { loop: true, speed: 0.3, intensity: 0.9 });
engine.lighting.setAccentIntensity(1.4);
engine.cameraRig.applyPreset({ position:[0,0.6,9], target:[0,0,0], fov: CAMERA.fovCalm });

const runtime = new StandaloneRuntime(engine, container, { canvas, interactionTarget });
runtime.start('idle');   // begins RAF loop
runtime.dispose();       // full teardown (materials, scene, events, renderer)
```

---

## 10. Rules for future contributors

- **Never** create a second `WebGLRenderer`, `Scene`, camera, cube, material
  library, energy or particle system. If you think you need one, you need a new
  **module** or a **camera preset**, not a new renderer.
- **Never** hardcode a duration, easing, colour, FOV or damping constant. Add it to
  `config/tokens.ts` with a Motion-Bible citation and read it.
- Keep motion **deterministic**: derive from `elapsed` + `math/hash`, never wall
  clock or `Math.random()`.
- A module must fully undo itself in `exit()` (remove energy paths, release
  targets) — this is what guarantees the journey reverses cleanly.
- Extend via the **public barrel**. If something isn't exported, export it
  deliberately rather than deep-importing.
- Run `tsc --noEmit` in `packages/cube-engine` before committing; it must be clean.

See `04-landing-experience.md` for how the Django site consumes all of this, and
`../development/getting-started.md` to build and run.
