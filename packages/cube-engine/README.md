# @cublab/cube-engine

The reusable rendering engine that powers the entire CUB LAB platform. The primary
cube is **procedural software**, not a 3D asset — generated, subdivided and
transformed entirely at runtime (no GLB, no Blender). Hero is only the first
consumer; Solutions, Automation, Analytics, Infrastructure, Integrations and the
future dashboard all drive the same engine.

Implements the approved architecture (`docs/architecture/01-foundation.md`) and the
Motion Bible (`docs/architecture/02-creative-direction.md`). Those documents are the
law; this package is their implementation.

## Design rules

- **Framework-agnostic core.** Everything under `src/` except `src/react/` is pure
  TypeScript + Three.js. React Three Fiber is an *optional* host, not a dependency.
- **One responsibility per system. No God classes. No circular dependencies.**
- **Single source of truth for tokens** — `src/config/tokens.ts`. No magic numbers
  live anywhere else.
- **Zero allocation inside the render loop.** All per-frame objects are scratch
  instances allocated once; pools (energy, particles) recycle slots.
- **One WebGL context, one clock, one loop.** The host (`StandaloneRuntime` or the
  R3F `<CubeCanvas>`) decides *when* to render; the engine only advances the world.

## Folder structure

```
src/
├─ config/        tokens.ts                — the law (colors, motion, cube, camera)
├─ core/          CubeEngine, EventBus, AnimationClock, types, EngineEvents
├─ cube/          ProceduralCube, CubeletGeometry
├─ state/         StateMachine, CubeStateMachine, ModuleRegistry, CubeModule
│  └─ modules/    Idle, Assembly, Network, Grid, Data
├─ materials/     MaterialLibrary
├─ energy/        EnergyEngine
├─ particles/     ParticleEngine        (engine only — no Hero particles this stage)
├─ interaction/   InteractionEngine
├─ rendering/     Renderer, CameraRig, LightingRig, EnvironmentManager, StandaloneRuntime
├─ performance/   PerformanceManager, QualityManager
├─ theme/         ThemeManager, themePresets
├─ assets/        AssetManager          (future decorative GLBs/textures only)
├─ scene/         SceneDirector
├─ math/          easing, damp, hash
├─ react/         CubeProvider, CubeCanvas, hooks   (@cublab/cube-engine/react)
└─ index.ts       public API
```

## Usage — React (the platform's primary host)

```tsx
import { CubeProvider } from '@cublab/cube-engine/react';
import { CubeCanvas, useCube, useCubeState } from '@cublab/cube-engine/react';

// Mount the single persistent canvas client-side only (Architecture §13, R9):
//   const CubeCanvas = dynamic(() => import(...).then(m => m.CubeCanvas), { ssr: false })

export function Experience() {
  return (
    <CubeProvider options={{ theme: 'dark' }}>
      <CubeCanvas className="fixed inset-0 -z-10" initial="idle" />
      {/* DOM sections drive the cube via events — the cube leads, the UI follows */}
    </CubeProvider>
  );
}
```

Any section requests cube behavior without touching Three.js:

```tsx
function SolutionsSection() {
  const engine = useCube();
  // when this section scrolls into view:
  engine.events.emit('SECTION_ENTER', { id: 'solutions' });
  return null;
}
```

Wire sections to states once (typically at provider setup):

```ts
engine
  .mapSection('hero', 'idle')
  .mapSection('solutions', 'network')
  .mapSection('automation', 'grid')
  .mapSection('analytics', 'data');
```

## Usage — standalone (no React)

```ts
import { CubeEngine, StandaloneRuntime } from '@cublab/cube-engine';

const engine = new CubeEngine({ theme: 'dark' });
const runtime = new StandaloneRuntime(engine, document.getElementById('stage')!);
runtime.start('idle');
// ...
runtime.dispose();
```

## Extending — add a cube behavior (open/closed)

New sections add a module and register it. **No existing file changes.**

```ts
import type { CubeModule, ModuleContext } from '@cublab/cube-engine';

class OrbitModule implements CubeModule {
  readonly id = 'orbit' as const; // add 'orbit' to ModuleStateName when promoting to core
  enter(ctx: ModuleContext) { /* set cube targets, camera preset, energy paths */ }
  exit(ctx: ModuleContext) { /* release energy paths */ }
  update(dt: number, t: number, ctx: ModuleContext) { /* optional per-frame */ }
}

engine.registerModule(new OrbitModule());
engine.transitionTo('orbit');
```

## Scripts

```bash
npm run typecheck   # tsc --noEmit — passes clean under strict + verbatimModuleSyntax
```

## Not in this stage (by design)

- No Hero section, no marketing components, no landing UI — engine only.
- No Django/API coupling — the engine never talks to a backend.
- Hero particle choreography is not implemented; the ParticleEngine that will power
  it is.
