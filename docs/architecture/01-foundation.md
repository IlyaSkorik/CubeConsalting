# CUB LAB — Foundation Architecture

**Stage 1 — Product Architecture & Technical Design**
Internal engineering document · Owner: Frontend Architecture · Status: Draft for senior review

---

## 0. Context, reality check, and the decision this document makes

Before any architecture, the honest starting position.

**What exists today (verified against the repo):**

- A **Django 6.0** application (`config/`, `core/`) that renders **server-side HTML templates**.
- `core/views.home` sniffs the `User-Agent` and renders one of two template trees: `templates/desktop/` or `templates/mobile/`.
- Styling is **Tailwind CSS v4** compiled by the Tailwind CLI into `static/{desktop,mobile}/css/*.css` (two independent builds).
- 3D is **vanilla Three.js `0.184`** in two hand-written modules — `static/desktop/js/three-hero.js` (~565 lines, `GLTFLoader` + GSAP) and `static/desktop/js/solutions-3d.js` (~218 lines) — bundled to `*.bundled.js` by **esbuild**.
- Interaction is vanilla JS: `navbar.js` (theme toggle), `spa-nav.js` (smooth scroll + `IntersectionObserver` active-link tracking).
- Assets: GLB cube models (`static/desktop/models/*.glb`), Geist + Inter fonts, light/dark hero backgrounds. Accent color in code is electric cyan-blue (`0x00d9ff`) on deep navy (`0x020817`).
- There is **no React, no Next.js, no DRF API, no auth, no Redis/Celery, no Docker** in the tree yet.

**What the brief asks for:** a decoupled **Next.js (App Router) + React + TypeScript + R3F + Framer Motion + Lenis** frontend that consumes an **assumed-existing Django REST backend**, and that already embodies the design system the future SaaS dashboard will inherit.

**The gap is the whole point.** The brief is not describing the current site — it is describing the platform the current site becomes. So this document does two things at once:

1. Specifies the **target architecture** in full (sections 1–20), as if building the Next.js frontend fresh.
2. Treats the **existing Django template site as the migration source**, not throwaway work. The current `three-hero.js` cube logic, the token values baked into the Tailwind theme, the GLB models, and the scroll/IntersectionObserver behavior are all **portable IP** that seed the target build. The roadmap (§18) sequences the migration so the live site never regresses.

**The single most important architectural decision, stated once:**

> Django stops rendering HTML and becomes a **pure JSON API** (DRF). Next.js becomes the **only** thing that renders UI. The two deploy independently. Everything below follows from this.

Why: the brief's five-year horizon (dashboard, CRM, analytics, admin, docs, developer portal, customer portal) is an *application*, not a set of pages. Application UI — authenticated, stateful, real-time, deeply interactive — is not what Django templates are good at, and it is exactly what React + a typed API layer are good at. Committing to the split now means the landing page and the dashboard share one codebase, one design system, one build, and one deployment story from day one, instead of a rewrite later.

---

## 1. Overall application architecture

**Topology:** two independently deployable systems joined only by a typed HTTP contract.

```
                    ┌────────────────────────────────────────────┐
   Browser  ──────► │  Next.js (App Router) — the ONLY UI layer    │
                    │  SSR/ISR for marketing · CSR for app shell   │
                    │  R3F cube engine · Framer Motion · Lenis     │
                    └───────────────┬──────────────────────────────┘
                                    │  HTTPS · JSON · JWT (typed SDK)
                                    ▼
                    ┌────────────────────────────────────────────┐
   Nginx  ────────► │  Django + DRF — headless API only            │
                    │  Auth · AI services · CRM · Telegram · CRON  │
                    └───┬──────────┬──────────┬──────────┬─────────┘
                        ▼          ▼          ▼          ▼
                    Postgres     Redis      Celery    3rd-party
                                (cache/    (async     (OpenAI,
                                 broker)    jobs)      Telegram…)
```

**Rendering strategy — per surface, not global.** The App Router lets us choose rendering mode *per route*, and we exploit that:

| Surface | Mode | Why |
| --- | --- | --- |
| Landing / marketing | **SSR + ISR** | SEO, fast first paint, cacheable at the edge. The cube hydrates on top of server-rendered HTML. |
| Docs / blog / pricing | **SSG / ISR** | Content changes rarely; serve static, revalidate on publish. |
| Auth pages | **SSR** | No SEO need, but server render avoids a flash and lets middleware guard. |
| Dashboard / CRM / analytics | **CSR (client shell)** | Authenticated, per-user, stateful, real-time. SSR buys nothing and costs latency. |

**Why decoupled at all** (vs. Django templates or Django + HTMX): the future is an *app*, and app UI needs client-side state, optimistic updates, websockets, code-splitting per feature, and a component model that a template engine cannot express. Decoupling also lets the two halves scale, deploy, and be owned by different people on different cadences — the frontend can ship 5× a day without touching Django.

**Cost we are accepting** (stated honestly): decoupling adds a hydration boundary, a build pipeline, an auth-token dance, and a CORS/proxy surface that a monolith avoids. We pay it deliberately because the alternative is a rewrite in year two.

---

## 2. Folder structure (target Next.js app)

Feature-first, not type-first. Group by *what it does*, not *what it is* — this is what keeps a five-year codebase navigable.

```
frontend/
├─ app/                          # App Router — routing = folders
│  ├─ (marketing)/               # Route group: SSR/ISR landing surfaces
│  │  ├─ page.tsx                #   / (the landing page)
│  │  ├─ pricing/page.tsx
│  │  └─ layout.tsx              #   marketing shell (Lenis, cube provider)
│  ├─ (app)/                     # Route group: authenticated dashboard
│  │  ├─ dashboard/page.tsx
│  │  ├─ crm/…
│  │  ├─ analytics/…
│  │  └─ layout.tsx              #   app shell (sidebar, auth guard)
│  ├─ (auth)/                    # login / register / reset
│  ├─ api/                       # BFF route handlers (proxy, webhooks)
│  ├─ layout.tsx                 # root: providers, fonts, theme
│  └─ global-error.tsx
│
├─ src/
│  ├─ features/                  # ★ the important one — vertical slices
│  │  ├─ hero/                   #   components + hooks + motion, colocated
│  │  ├─ solutions/
│  │  ├─ laboratory/
│  │  ├─ case-studies/
│  │  ├─ crm/                    #   future dashboard features live here too
│  │  └─ analytics/
│  │
│  ├─ cube/                      # ★ the Cube Engine (see §5) — framework-agnostic core
│  │  ├─ core/                   #   pure Three.js, no React
│  │  ├─ modules/                #   swappable behaviors (hero, grid, network…)
│  │  ├─ materials/  geometry/  postfx/
│  │  └─ react/                  #   R3F bindings that wrap core/
│  │
│  ├─ design-system/             # ★ tokens + primitives (see §11)
│  │  ├─ tokens/                 #   the single source of truth (TS + CSS vars)
│  │  ├─ primitives/             #   Button, Card, Glass, Text…
│  │  └─ patterns/               #   composed, still generic (Section, Grid)
│  │
│  ├─ motion/                    # motion tokens, variants, orchestration (see §12)
│  ├─ scroll/                    # Lenis provider, scroll-linked hooks (see §7)
│  │
│  ├─ services/                  # API layer (see §9–10)
│  │  ├─ http/                   #   client, interceptors, auth refresh
│  │  ├─ contracts/              #   generated types from OpenAPI
│  │  └─ <domain>/               #   auth/, crm/, agents/, telegram/…
│  │
│  ├─ state/                     # Zustand stores + React Query setup (see §8)
│  ├─ lib/                       # framework-free utilities
│  └─ config/                    # env, feature flags, route maps
│
├─ public/                       # static assets (see §16)
├─ tests/  ·  e2e/               # unit/component  ·  Playwright
└─ [config files]
```

**Why this shape:**

- **`features/` over `components/`**: a type-first tree (`components/`, `hooks/`, `utils/`) forces you to touch four directories to change one feature and makes deletion scary. A vertical slice is added, understood, and deleted as a unit. This is the single biggest maintainability lever over five years.
- **`cube/` is a package, not a component.** The brief says "the cube itself should become an independent rendering engine." So it lives outside `features/`, has no React in its core, and could be published as an npm package. Features *consume* it; they don't own it.
- **`design-system/` is separate from `features/`** so the dashboard can import the exact same primitives the landing page uses. This is the mechanism that makes the brief's "reusable inside the SaaS dashboard" real rather than aspirational.
- **Route groups `(marketing)` / `(app)` / `(auth)`** give each surface its own layout, providers, and rendering mode without leaking into each other's bundles.

---

## 3. Component hierarchy

Four tiers, strict dependency direction (each tier may only import from tiers above it):

```
Tier 1  Tokens & primitives      Button, Text, Glass, Card, Icon
          (design-system/)         — dumb, generic, no business logic
              ▲
Tier 2  Patterns                 Section, Grid, Container, Reveal, Marquee
          (design-system/)         — composition of primitives, still generic
              ▲
Tier 3  Feature components       HeroSection, SolutionsGrid, CaseStudyCard
          (features/*)             — business meaning, consume services + cube
              ▲
Tier 4  Route compositions       app/(marketing)/page.tsx
          (app/*)                  — assemble features, own layout & data
```

**Rules:**

- A primitive **never** imports a feature. A feature **never** reaches into another feature (shared logic graduates down to a pattern or up to a service).
- The cube is injected via a **provider + hook** (`useCube()`), never imported directly into leaf components — so a section requests cube behavior ("enter network mode") without knowing how the cube renders.
- Leaf components are **presentational**; data and side-effects live in the route/feature container. This keeps components storybook-able and testable in isolation.

**Why:** enforced dependency direction is what prevents the slow slide into a spaghetti graph. It's the difference between "add a feature" and "add a feature and pray nothing else breaks."

---

## 4. Three.js architecture

Three.js is wrapped by **React Three Fiber (R3F)** but never *depends* on React for its logic. R3F is the binding; the brains are plain Three.

**Single renderer, not one-per-section.** Today the repo has *two* independent `WebGLRenderer`s (`three-hero.js` and `solutions-3d.js`), each with its own canvas, RAF loop, and GLTF load. That doesn't scale — every new 3D section would add a context. The target is **one persistent `<Canvas>`** (R3F) mounted at the marketing layout, living behind the DOM, that every section drives. This is what makes the brief's "one continuous experience / the cube remains the central character" physically true rather than a metaphor.

```
<CubeCanvasProvider>            # one WebGL context, one RAF loop
   ├─ SceneGraph                # camera rig, lights, environment
   ├─ CubeEngine                # the persistent cube (§5)
   ├─ PostFX stack              # bloom, DOF, SSR — added as budget allows
   └─ ScrollDirector            # maps scroll progress → cube module (§7)
```

**Key decisions and why:**

- **One RAF loop.** R3F drives a single `useFrame` clock. Multiple loops fight for the main thread and desync animations. One loop = deterministic frame ordering.
- **`InstancedMesh` for anything repeated** (particle fields, the "grid of modules," connection nodes). The brief mandates it; the reason is draw-call count — 10 000 cubes as instances is one draw call, as meshes it's 10 000 and a dead GPU.
- **Assets loaded once, cached, reused.** `GLTFLoader` + `useGLTF` with a Draco/Meshopt-compressed pipeline; the current uncompressed `.glb`s get compressed in the asset step (§16). Geometry and materials are shared across instances.
- **Renderer settings carried over from current code** (they're already good): `ACESFilmicToneMapping`, `SRGBColorSpace`, `pixelRatio` clamped to `min(dpr, 2)`. We keep these as the renderer defaults.
- **Layered scenes over multiple canvases** when we need "separate" 3D moments — use camera layers / render targets on the *one* context, not new contexts.

---

## 5. Cube Engine architecture

The cube is the platform's protagonist and must be an **engine, not a component**. Design it as a small framework-agnostic core with swappable *modules*, wrapped thinly by R3F.

```
cube/
├─ core/
│  ├─ CubeEngine.ts        # lifecycle: init, update(dt), dispose, resize
│  ├─ CubeState.ts         # finite-state machine: which module is active
│  └─ CubeBus.ts           # event bus: sections emit intents, engine reacts
├─ modules/                # a "behavior" the cube can express
│  ├─ IdleModule           #   breathing/rotating hero cube (from three-hero.js)
│  ├─ NetworkModule        #   cube explodes into connected nodes (solutions)
│  ├─ GridModule           #   cube tiles into a grid of product modules
│  ├─ AssemblyModule       #   particles converge → cube forms (laboratory)
│  └─ DataModule           #   cube surfaces as analytics/data viz
├─ materials/  geometry/  postfx/
└─ react/
   ├─ CubeProvider.tsx     # owns the engine instance, exposes context
   └─ useCube.ts           # useCube().transitionTo('network')
```

**The mental model:** the cube is a **finite-state machine**. It is always in exactly one *module* (Idle, Network, Grid, Assembly, Data). Sections don't animate the cube directly — they emit an **intent** ("I'm entering, become the network") onto `CubeBus`; `CubeState` decides the legal transition; the engine tweens between module states. This is why the experience feels like "one living OS": there is one object with one state, transitioning, not five separate widgets.

**Why an FSM + modules:**

- **Extensibility** — a new section = a new module registered with the engine, zero changes to existing ones. This is how the dashboard later gets its own cube behaviors.
- **Testability** — modules are pure state→visual mappers; transitions are unit-testable without a GPU.
- **Isolation** — the brief demands "every animation isolated." A module owns its geometry/material/motion and cleans up on exit.
- **Determinism** — one active state removes the class of bugs where two scroll triggers fight over the cube.

**Migration seed:** the existing `three-hero.js` (GLTF cube + GSAP breathing/rotation) becomes `IdleModule`; `solutions-3d.js` becomes the basis of `NetworkModule`. We port logic, not files.

---

## 6. Animation architecture

Three animation systems, each with a **defined jurisdiction** — the discipline is *never* mixing them on the same property.

| System | Jurisdiction | Why it and not the others |
| --- | --- | --- |
| **Framer Motion** | DOM: layout, enter/exit, gestures, shared-layout transitions, page transitions | Declarative, React-aware, respects React's lifecycle & `prefers-reduced-motion` for free |
| **anime.js / GSAP** | Fine-grained timelines, SVG, sequenced text, numeric tweens that aren't component state | Timeline control Framer lacks; the repo already uses GSAP — we keep it for the cube's internal tweens |
| **R3F `useFrame`** | Everything inside the WebGL context (cube, particles, camera) | Runs on the render loop, not React reconciliation — the only correct place for per-frame 3D |

**Rules that keep it sane:**

- **One property, one owner.** A DOM node's transform is Framer's *or* GSAP's, never both — double-owned properties are the #1 source of jank.
- **Motion values, not re-renders.** Scroll/pointer drive Framer `MotionValue`s and R3F refs directly; they must not call `setState` per frame (see §13).
- **Orchestration lives in `motion/`**, declaratively: named variants and transition tokens (§12), so a designer can retune timing without touching component code.
- **The cube is choreographer, DOM is chorus.** Section reveals (Framer) are *triggered by* the same scroll progress that drives cube transitions (§7), so DOM and 3D move as one story beat.

---

## 7. Scroll architecture

**Lenis** owns scroll; nothing else touches `scrollTop`.

```
scroll/
├─ LenisProvider.tsx     # one Lenis instance at the marketing root
├─ useScrollProgress.ts  # 0..1 global + per-section progress (MotionValues)
└─ ScrollDirector.ts     # maps progress ranges → cube intents + reveal triggers
```

**How the "one continuous journey" is built:**

1. Lenis produces a smooth, unified scroll position (replacing the hand-rolled easing in the current `spa-nav.js`).
2. `useScrollProgress` converts it into **MotionValues** — global `0→1` and normalized per-section — with **zero React re-renders**.
3. `ScrollDirector` subscribes to those values and, at defined thresholds, emits cube intents (`transitionTo('network')`) and unlocks Framer reveal variants. Scroll *is* the timeline that drives both the cube (§5) and DOM motion (§6) in lockstep.
4. Active-nav tracking (currently `IntersectionObserver` in `spa-nav.js`) is retained via IO — cheap, correct, and off the main thread. Lenis handles motion; IO handles "which section am I in."

**Why Lenis over native/GSAP ScrollSmoother:** it's tiny, framework-neutral, integrates with `requestAnimationFrame` sync so it shares the *one* RAF loop with R3F (no competing loops), and degrades to native scroll under `prefers-reduced-motion`.

**Non-negotiable:** smooth scroll must be *disableable*. Under reduced-motion or on low-end devices we fall back to native scroll and the cube goes to a static pose (§13, §15).

---

## 8. State management architecture

Match the tool to the *kind* of state — the classic mistake is one global store for everything.

| Kind of state | Tool | Example |
| --- | --- | --- |
| **Server state** (owned by Django) | **TanStack Query** | user, CRM records, agents, analytics — anything fetched |
| **Global client state** | **Zustand** | theme, auth session, cube state mirror, feature flags, layout |
| **Local UI state** | React `useState`/`useReducer` | form fields, open/closed, hover |
| **URL state** | App Router search params | filters, tabs, pagination — shareable & back-button-correct |
| **Ephemeral animation state** | MotionValues / refs | scroll progress, pointer, cube tween — **never** React state |

**Why this split:**

- **Server state is not client state.** It's a *cache* of someone else's data with staleness, refetch, and invalidation concerns — Query exists precisely for this. Putting it in Zustand means reinventing caching badly.
- **Zustand over Redux** — the brief values minimalism; Zustand gives selector-based subscriptions (components re-render only on the slice they read) with a fraction of the boilerplate. Critical for perf: the theme toggle must not re-render the cube.
- **Animation state stays out of React entirely** — see §13. This is the rule that protects 60fps.
- **The cube's canonical state lives in the engine (`CubeState`, §5)**; Zustand holds only a *mirror* for UI that needs to read it (e.g., a nav dot). One-way sync, engine is source of truth.

---

## 9. API layer architecture

A single typed gateway between UI and Django. UI code **never** sees `fetch`.

```
services/
├─ http/
│  ├─ client.ts           # base fetch/axios wrapper, baseURL, timeouts
│  ├─ interceptors.ts     # attach JWT, refresh-on-401, error normalization
│  └─ errors.ts           # typed AppError taxonomy
├─ contracts/             # types GENERATED from Django's OpenAPI schema
│  └─ *.ts                #   never hand-written, never drift
└─ query/                 # TanStack Query keys, hooks per domain
```

**Decisions and why:**

- **Types are generated from Django's OpenAPI/DRF schema**, not hand-written. DRF (with `drf-spectacular`) emits an OpenAPI doc; we codegen TS types from it in CI. This is how "strongly typed REST services" (the brief) stops being a slogan — a backend field rename becomes a **frontend compile error**, not a production bug.
- **One HTTP client, centralized cross-cutting concerns.** Auth header injection, 401→refresh→retry, timeout, and error normalization live in interceptors — written once, impossible to forget.
- **JWT with silent refresh.** Access token in memory (Zustand), refresh token in an httpOnly cookie set by Django. Interceptor transparently refreshes on 401 and replays the request. Never store tokens in `localStorage` (XSS).
- **BFF for anything secret or cross-origin-awkward.** Next.js `app/api/` route handlers proxy calls that need a server secret (webhooks, third-party keys) so those never touch the browser, and neatly sidestep CORS for same-origin calls.
- **Query keys are a typed, centralized registry** — so invalidation ("refetch all CRM after this mutation") is reliable and greppable.

---

## 10. Service layer architecture

The API layer (§9) is *transport*. The **service layer** is *domain* — one module per backend bounded context, exposing intention-revealing functions and Query hooks.

```
services/
├─ auth/        login(), logout(), useSession(), refresh()
├─ agents/      useAgents(), createAgent(), useAgentRun()
├─ workflows/   useWorkflows(), runWorkflow()
├─ crm/         useContacts(), useDeals(), updateDeal()
├─ telegram/    useBots(), connectBot()
├─ analytics/   useMetrics(range), useFunnel()
└─ integrations/ useApiKeys(), useWebhooks()
```

**Why a layer above the HTTP client:**

- **Components speak domain, not HTTP.** A component calls `useDeals()`, not `client.get('/crm/deals')`. Endpoints, params, and caching are the service's problem. Refactoring the backend URL touches one file.
- **Mirrors Django's bounded contexts** (auth, AI, CRM, Telegram, analytics — straight from the brief), so backend and frontend share a mental map and ownership boundaries.
- **The seam for mocking and contract tests** — each service can be stubbed for Storybook/tests without a live backend, and contract-tested against the OpenAPI schema.
- **Enforces the brief's "frontend must never duplicate backend logic"** — services *fetch and cache*, they don't *compute business rules*. Any temptation to reimplement a Django rule in TS is a red flag caught at review.

---

## 11. Design System structure

The design system is the **contract between the landing page and the future dashboard**. It is tokens first, components second.

```
design-system/
├─ tokens/
│  ├─ color.ts        # electric-blue accent, deep-navy, graphite, glass — as tokens
│  ├─ space.ts        # 4px base scale
│  ├─ type.ts         # Geist (display) + Inter (text) scale & weights
│  ├─ radius.ts  shadow.ts  glass.ts  border.ts
│  ├─ motion.ts       # durations + curves (shared with §12)
│  └─ index.css       # tokens emitted as CSS custom properties (--primary…)
├─ primitives/        # Button, Text, Card, Glass, Icon, Input, Badge
└─ patterns/          # Section, Container, Grid, Reveal, Stat, Marquee
```

**Decisions and why:**

- **Tokens exist twice, from one source: TS objects → CSS variables.** TS values feed R3F/Three (colors as numbers, timings as ms) and Tailwind's theme; the same values are emitted as CSS custom properties for runtime theming. **One source of truth, two consumers (JS and CSS).** The current repo already leans on CSS vars (`--primary`, `drop-shadow-[…var(--primary)]`) and Tailwind v4's `@theme` — we formalize that into `tokens/`.
- **Theme = swapping CSS-variable values, not classes.** Dark mode is a distinct, intentionally-designed token set (the brief: "dark mode is NOT an inverted light mode"), toggled by a `data-theme` attribute on `<html>` — carrying forward exactly what `navbar.js` already does, now token-driven. This makes theming instant, flash-free (set before paint), and free for the cube (it reads the same tokens).
- **Glassmorphism as a token, not ad-hoc CSS.** `glass.ts` defines blur/opacity/border/tint per theme so every glass surface is consistent and tunable in one place.
- **Primitives are generic; nothing in `design-system/` knows what CUB LAB sells.** That's what lets the dashboard import them unchanged.
- **Tailwind v4 stays**, configured *from* tokens (`@theme` reads token values). We don't fight the existing styling approach — we give it a spine.

---

## 12. Motion System

Motion is tokenized like color. No magic numbers in components.

```
motion/
├─ tokens.ts       # durations (instant 120 / fast 240 / base 400 / slow 700ms)
│                  # curves (standard, decelerate, accelerate, spring configs)
├─ variants.ts     # named Framer variants: reveal, stagger, glassIn, cubePulse
└─ orchestrate.ts  # sequence helpers tying scroll → variants → cube intents
```

**Principles (from the brief, made concrete):**

- **A small, fixed vocabulary of durations and curves.** Every animation picks from the set. Consistency of *timing* is what makes a site feel "expensive" — more than any single effect.
- **Motion communicates, never decorates.** Each variant maps to a *meaning*: `reveal` = content arriving, `stagger` = hierarchy, `glassIn` = surface materializing, `cubePulse` = the cube reacting to you. If a motion doesn't carry information, it's cut.
- **Spring for interaction, ease for transition.** Gestures/hover use springs (physical, interruptible); entrances/page-transitions use eased tweens (composed, predictable).
- **Reduced-motion is a first-class variant set**, not an afterthought — `variants.ts` ships a `reduced` counterpart for each, selected by a media query (§15).
- **Shared timing across DOM and 3D.** `motion/tokens.ts` and `cube/`/GSAP read the *same* curve/duration values, so a section's DOM reveal and the cube's transition share a beat.

---

## 13. Performance optimization strategy

Target: **60fps on desktop/laptop/tablet, graceful ≥30fps on mobile/low-end.** The strategy is layered.

**Rendering / React:**
- **Animation never touches React state.** Scroll, pointer, and per-frame values flow through MotionValues and refs. A `setState` in a `useFrame` is a firing offense — it re-renders the tree 60×/s.
- **Selector-based store subscriptions** (Zustand) so a change to one slice re-renders only its readers.
- **`React.memo` + stable refs** on cube-adjacent components; the canvas subtree must not re-render on unrelated DOM state.

**WebGL / cube:**
- **One context, one RAF loop** (§4) — the biggest single win over the current two-renderer setup.
- **`InstancedMesh`** for all repetition; **shared geometry/materials**; **frustum culling** and **on-demand rendering** (R3F `frameloop="demand"` when the cube is idle and off-screen).
- **Draco/Meshopt-compressed GLBs**, `KTX2` textures, model preloading during idle.
- **PostFX is budgeted, not free** — bloom/DOF only where they carry meaning, disabled first on downgrade.

**Loading / bundle:**
- **Route-level code splitting** (App Router does this) + **dynamic imports** for the cube and each heavy feature — the landing page must not ship dashboard JS.
- **Lazy-mount the canvas** below the fold; **Suspense** boundaries with skeletons.
- **Fonts**: `font-display: swap`, subset Geist/Inter, preload the two weights actually used above the fold.

**Adaptive quality (the safety net):**
- A **device-capability probe** at boot (GPU tier heuristic, DPR, memory, `prefers-reduced-motion`) sets a **quality tier**. Tier controls: DPR clamp, particle counts, postFX on/off, shadow resolution, and whether smooth scroll runs. The experience *degrades*, it doesn't *break*.

**Measurement:** budget-gated CI (Lighthouse CI + bundle-size check), a dev FPS/draw-call overlay, and real-user Web Vitals (LCP/INP/CLS) reporting. Perf is a **tracked metric with a budget**, not a vibe.

---

## 14. Responsive strategy

**One responsive React app — not the current two template trees.** Today Django UA-sniffs and serves separate `desktop/` vs `mobile/` HTML. That's two codebases to maintain and drifts immediately. The target is a **single component tree that adapts by breakpoint**, with UA-sniffing kept only as an *optional* SSR hint for choosing an initial cube tier (not for choosing markup).

- **Fluid-first**: `clamp()` type/space scales, container queries for components that must adapt to their slot (dashboard panels), Tailwind breakpoints for layout shifts.
- **3D is tier-based, not device-based**: the cube renders on capable phones at a reduced tier and falls back to a **static rendered image / poster** on the weakest — same content, right fidelity. (The existing light/dark hero PNGs are perfect posters for this fallback.)
- **Touch vs pointer**: gesture affordances (drag-to-rotate the cube) enabled by input type, not screen size.
- **Layout primitives** (`Container`, `Grid`, `Section`) encapsulate responsive rules so features don't re-implement breakpoints.

Why collapse the two trees: the mobile/desktop split is the highest-maintenance-cost decision in the current repo. One adaptive tree with tiered 3D gives us the same outcome (great on phone, spectacular on desktop) at half the code and zero drift.

---

## 15. Accessibility strategy

Accessibility is designed in, not bolted on — and it's mostly *free* if the primitives are right.

- **Semantic HTML in primitives**: `Button` is a `<button>`, `Section` is `<section>` with a heading, landmarks are real. Get this right once in `design-system/` and every feature inherits it.
- **Keyboard**: full tab order, visible focus rings (a token, styled per theme), focus trapping in modals, skip-link to main. The cube is decorative → `aria-hidden`, never a keyboard trap.
- **`prefers-reduced-motion` is load-bearing**: it disables Lenis smooth scroll, swaps Framer variants to the `reduced` set, freezes the cube to a static pose, and kills parallax. Wired at the provider level so it's impossible to bypass.
- **Contrast**: token pairs are validated to WCAG AA in both themes in CI (the electric blue on navy must pass on text, not just accents).
- **Screen readers**: 3D conveys nothing essential; all meaning is in the DOM. `aria-live` for async states (form submit, data load). Images have alt; icons that carry meaning have labels.
- **Testing**: `axe` in CI + manual keyboard/SR passes on each release.

---

## 16. Asset organization

```
public/
├─ models/        # Draco/Meshopt-compressed .glb (compressed from current uncompressed set)
├─ textures/      # KTX2 / basis
├─ fonts/         # subset Geist + Inter (woff2), self-hosted
├─ posters/       # static cube/hero fallbacks (reuse existing dark/light PNGs)
└─ icons/  images/
```

- **Compress the GLBs.** The current `model*.glb` are raw; Draco/Meshopt + KTX2 typically cut model payload 5–10×. This is the cheapest mobile perf win available.
- **Self-host subset fonts** (already have Geist/Inter TTFs) → woff2, subset to used glyphs, preload the above-fold weights. No third-party font CDN (privacy + a network dependency on the critical path).
- **Posters are a feature, not leftovers** — the existing `hero-bg-{dark,light}.png` and `case-dashbord-*` become the low-tier/reduced-motion fallbacks (§14).
- **Content-hashed filenames** via the build for cache-busting; long `max-age` immutable caching at Nginx/CDN.
- **Versioned model manifest** so the cube engine can lazy-load the right LOD/tier asset.

---

## 17. Suggested project structure (monorepo)

Adopt a monorepo so frontend, backend, and shared contracts version together.

```
cub-lab/
├─ apps/
│  ├─ web/            # the Next.js frontend (structure = §2)
│  └─ api/            # the Django project (existing config/ + core/, made headless)
├─ packages/
│  ├─ contracts/      # OpenAPI schema + generated TS types (shared, §9)
│  ├─ cube-engine/    # the Cube Engine, publishable (§5)
│  └─ design-system/  # tokens + primitives, publishable (§11)
├─ infra/             # Docker, Nginx, compose, CI
└─ docs/              # this document + ADRs
```

**Why monorepo:** the contracts package is the killer feature — backend schema changes regenerate types that break the frontend build *in the same PR*. Cube-engine and design-system as packages enforce the "reusable in the dashboard" boundary physically (you can't accidentally import a feature into a package). Tooling: pnpm workspaces + Turborepo for cached builds; Django stays a normal project inside `apps/api`.

**Why not multi-repo (yet):** at this team size the coordination cost of versioning three repos outweighs the isolation benefit. Revisit if backend and frontend teams fully split.

---

## 18. Suggested implementation roadmap

Sequenced so the **live site never regresses** and each phase ships value. This is a migration, not a big-bang rewrite.

**Phase 0 — Foundations (no user-visible change).**
Monorepo skeleton; Next.js app booted; `design-system/tokens/` extracted from the current Tailwind theme + CSS vars; DRF + `drf-spectacular` added to Django, first OpenAPI schema emitted; contracts codegen wired. *Exit:* tokens single-sourced, types generating.

**Phase 1 — Cube Engine core.**
Build `cube-engine` with the FSM + one `IdleModule` ported from `three-hero.js`. Single R3F canvas, one RAF loop, adaptive quality tier probe. *Exit:* the hero cube runs in R3F at 60fps with the reduced-motion fallback working.

**Phase 2 — Landing page parity in Next.js.**
Rebuild hero → solutions → laboratory → case → footer as `features/*` on the new canvas, with Lenis + scroll director + Framer motion system. Port `NetworkModule` from `solutions-3d.js`. *Exit:* Next.js landing matches/exceeds current site; A/B behind a flag.

**Phase 3 — Cutover.**
Django stops rendering templates; Nginx routes `/` to Next.js; Django serves only `/api`. Delete `templates/` and the two-tree mobile/desktop split (§14). *Exit:* one responsive app in production.

**Phase 4 — Auth + app shell.**
JWT flow (§9), `(app)` route group, sidebar shell, TanStack Query + Zustand wired. First real API-backed screen. *Exit:* users can log in and reach a dashboard shell.

**Phase 5 — Dashboard features.**
CRM, agents, workflows, analytics as `features/*` reusing the exact design system and cube (Data/Grid modules). *Exit:* the platform the brief describes.

Docs, blog, pricing, developer portal slot in as `(marketing)`/`(app)` route groups whenever prioritized — the architecture already has their home.

---

## 19. Technical risks

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | **WebGL perf on low-end mobile** — the cube tanks FPS or crashes the tab | High | Adaptive tiers (§13), static posters (§14), on-demand rendering, hard particle/DPR caps, real-device testing in CI |
| R2 | **Single-canvas complexity** — one cube driving many sections becomes a coupling knot | High | FSM + isolated modules (§5), one-way state sync, module contract tests |
| R3 | **Scroll-jank from mixing Lenis + Framer + R3F** | High | One RAF loop shared by all three (§7); one owner per property (§6); FPS overlay in dev |
| R4 | **Contract drift** between Django and TS | High | Generated types from OpenAPI (§9); CI fails on drift; no hand-written contracts |
| R5 | **JWT/auth security** (token theft, refresh races) | High | httpOnly refresh cookie, in-memory access token, single refresh mutex in interceptor, short access TTL |
| R6 | **Migration regression** during cutover | Med | Phased roadmap (§18), feature-flagged A/B, keep Django templates until Phase 3 exit criteria pass |
| R7 | **Bundle bloat** (Three + R3F + Framer + Lenis is heavy) | Med | Route splitting, dynamic import of cube, bundle budget in CI, tree-shaking, no dashboard JS on landing |
| R8 | **Design-system drift** — features fork primitives | Med | Primitives as a package (§17), lint rule against ad-hoc styles, Storybook as the canonical reference |
| R9 | **SSR/WebGL hydration mismatch** | Med | Cube is client-only (`dynamic(..., {ssr:false})`), mounts after hydration over server HTML |
| R10 | **Team ramp** on R3F/shader/motion discipline | Med | This doc + ADRs, engine abstracts raw Three, pairing on Phase 1 |

---

## 20. Best practices for long-term maintenance

- **ADRs for every significant decision.** `docs/adr/` — each records context, decision, alternatives, consequences. In five years the *why* matters more than the *what*; this document is ADR-0001.
- **Dependency direction is enforced, not hoped for.** Lint rules (`eslint-plugin-boundaries`) forbid features importing features, and anything importing into a package. The tiers of §3 are checked in CI.
- **The design system is the only styling authority.** No raw hex, no magic durations, no bespoke glass in features — a lint rule catches token bypass. Storybook is the source of truth for primitives.
- **Contracts are generated, never edited.** A hand-edited type in `contracts/` is a bug. CI regenerates and diffs.
- **Performance is a budget, not a vibe.** Lighthouse CI + bundle-size gates block regressions; Web Vitals tracked in prod.
- **Everything the brief calls "isolated" is genuinely isolated** — cube modules, motion variants, features — each added/deleted as a unit, each testable without the rest.
- **Tests where they pay**: unit for engine state/services/utils, component tests for primitives, Playwright e2e for the critical journeys (landing scroll story, auth, one dashboard flow). Not coverage theater.
- **Small PRs, feature-flagged, reversible.** The roadmap's phasing is also the operating rhythm: ship behind flags, measure, then remove the flag.
- **Keep Django's business logic in Django.** The recurring temptation over five years is to "just compute this on the frontend." The service layer (§10) is the wall; code review guards it.

---

### One-paragraph summary for the team

We are turning a Django-templated marketing site into a **decoupled Next.js + R3F platform** where **Django becomes a headless typed API** and **the cube becomes an engine** — an FSM of swappable modules driving a single persistent WebGL canvas that the whole page scrolls through as one continuous story. Tokens are single-sourced and shared with the future dashboard; motion, scroll, and 3D share one RAF loop and one timing vocabulary; server state, client state, and animation state each use the right tool; types are generated from the backend so drift is a compile error. We migrate in phases behind flags so the live site never regresses, and we enforce the boundaries (design system, feature isolation, contracts, perf budgets) in CI so the architecture survives contact with five years of feature pressure.
