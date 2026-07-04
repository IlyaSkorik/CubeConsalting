# CUB LAB — Landing Experience

**Stage 4 — the continuous narrative landing page**
Internal engineering document · Owner: Frontend / Creative Engineering · Status: Implemented

---

## 0. What this document is

This describes the **desktop landing experience exactly as implemented** — the one
persistent cube travelling through the whole page — and how it *consumes* the Cube
Engine (`03-rendering-engine.md`) without duplicating any of it. It is the
reference for adding or reordering scenes and for preserving the Motion Bible
(`02-creative-direction.md`) in the page layer.

**Core promise:** the visitor never feels they move between pages. There is one
cube, one scene, one journey. Everything transforms; nothing resets; scrolling
back perfectly reverses the experience.

---

## 1. The pieces

| File | Role |
|---|---|
| `templates/desktop/home.html` | page shell: the single persistent cube canvas, the z-layered content wrapper, the section rail, the `<head>` (SEO, anti-FOUC, preloads), loads the bundle |
| `templates/desktop/include/*.html` | the narrative stations (hero, solutions, case, laboratory, demo, footer) — existing Russian business content, transformed into scenes |
| `static/desktop/js/landing.ts` | the **Landing Experience controller** — the only engine consumer; owns one `CubeEngine` + `StandaloneRuntime` |
| `static/desktop/js/landing.bundled.js` | esbuild output actually served (Three.js + engine + controller, minified) |
| `static/src/base.css` | the shared design system: glass, scrim, reveal choreography, section rail, a11y/reduced-motion, loading fade |
| `static/desktop/js/navbar.js` / `spa-nav.js` | theme toggle (writes `data-theme`) and smooth in-page nav (reduced-motion aware) |

The mobile UA is routed by `core/views.home` to a **separate** `mobile/home.html`
tree — it is out of scope for this cube experience and must not be conflated with
it.

---

## 2. Page structure & stacking (home.html)

```
<body>                         (bg-bg)
 ├─ #cube-stage  fixed inset-0 z-0  pointer-events:none  aria-hidden   ← THE cube
 │    └─ #cube-canvas
 └─ .relative z-10                                              ← all content
      ├─ #section-rail  fixed z-40  (hidden < lg)               ← wayfinding dots
      ├─ navbar          sticky z-50
      ├─ #hero  #solutions  #case  #lab  #demo  #footer         ← the stations
      └─ <script type="module" src="landing.bundled.js">
```

- **One canvas, fixed, full-viewport, behind everything.** It is
  `pointer-events:none` so clicks pass through to content; `aria-hidden` so screen
  readers skip the decoration.
- Content sits in a `z-10` wrapper with a **transparent** background, so the cube
  shows through. Each scene section is transparent (or translucent) and lays a
  **`.cube-scrim`** over the cube to keep copy legible (see §4).
- The engine is created with `{ transparent: true }` so the WebGL scene has no
  background — the page body colour shows behind the cube.

### `<head>` (production concerns)

- `lang="ru"`, real `<title>`, meta `description`, Open Graph + Twitter card,
  `theme-color`, `color-scheme`, `robots`.
- **Anti-FOUC inline script** sets `data-theme` from `localStorage` *before first
  paint* so there is no light→dark flash.
- `modulepreload` for the bundle + style `preload` for faster first paint.

---

## 3. The controller (`landing.ts`)

One `CubeEngine` + one `StandaloneRuntime` for the entire page. The controller
adds **no** renderer/cube/camera/material/energy of its own — it configures the
engine and decides *when* the cube transforms.

### 3.1 Beats — sections mapped to cube states

```ts
const BEATS = [
  { id: 'hero',      state: 'idle',     accent: 1.25, rest: 'rich',
    // pulls the lens closer than the idle default so the cube reads as the core
    // of the hero constellation (see §9)
    camera: { position:[0,0.45,4.6], target:[0,0,0], fov: CAMERA.fov } },
  { id: 'solutions', state: 'network',  accent: 1.45 },
  { id: 'case',      state: 'data',     accent: 1.2  },
  { id: 'lab',       state: 'grid',     accent: 1.35 },
  { id: 'demo',      state: 'assembly', accent: 1.15 },
  { id: 'footer',    state: 'idle',     accent: 0.9, rest: 'subtle',
    camera: { position:[0,0.6,9], target:[0,0,0], fov: CAMERA.fovCalm } },
];
```

The eight-beat Motion-Bible story (rest → reach → reason → work → offer → rest) is
mapped onto the six real sections. Only five engine modules exist; the journey
**reuses** them with distinct accent/energy/camera so each beat feels its own
while never duplicating an engine system.

Each beat carries only *page-layer personality*: `accent` (accent-light
multiplier), `rest` (resting-energy flavour for the calm idle beats), and an
optional `camera` refinement applied **after** the module's own preset.

### 3.2 The scroll engine — reversible by construction

```
scroll ─▶ IntersectionObserver(all beat sections)
             │  tracks each section's visible ratio
             ▼
        pick the section with the highest ratio  ──▶  applyBeat(leader)
                                                          │
   engine.transitionTo(state) ─┐                          │
   cameraRig.applyPreset ──────┤ (skipped under reduced   │
   configureRestEnergy ────────┘  motion — see §6)        │
   lighting.setAccentIntensity ─────────────────────────  │
   rail dot .is-active ─────────────────────────────────  ▼
```

Because the active beat is derived from *which section currently dominates the
viewport*, scrolling back up makes the previous section dominant again and
re-applies its beat automatically — **no reverse code, no resets**. The engine's
damping turns each `transitionTo`/`applyPreset` into a smooth morph rather than a
cut.

### 3.3 Reveal choreography

`setupReveal()` runs a second `IntersectionObserver` over every `[data-reveal]`
element and toggles `.is-revealed` on visibility (so reveals also reverse on the
way up). It is **independent of WebGL** — content reveals even with no cube, so the
page is never left with invisible cards. Cards use `data-reveal="emerge"` (scale
up + de-blur, as if forming out of the cube) with a staggered `--reveal-delay`.

### 3.4 Preserved Hero behaviours & lifecycle

- resting core energy (`configureRestEnergy`, idempotent — re-armed whenever the
  cube settles to `idle`), a brighter hover pulse, a one-shot "acknowledge" sweep
  ~2.2 s after load, and theme-toggle sync via a `MutationObserver` on
  `data-theme`.
- **Loading fade**: after two RAFs (guaranteeing a composited frame) the controller
  sets `data-cube-ready`; CSS fades `#cube-stage` from 0→1.
- **WebGL fallback**: if the engine throws, it sets `data-cube="off"` (CSS hides the
  stage) and returns; sections keep their static styling.
- **Teardown**: on `pagehide` all observers/timers disconnect and
  `runtime.dispose()` releases the engine.

---

## 4. The design system (base.css)

One material vocabulary shared by navigation, cards, panels, CTAs and the rail.

- **`.cube-scrim`** — an absolutely-positioned overlay per section:
  `linear-gradient` of `color-mix(var(--bg) …%, transparent)`, denser at
  top/bottom (where copy sits), clear through the middle (where the cube lives).
  Fading to `--bg` at both edges also **blends adjacent sections into one
  continuous field** — no hard cuts.
- **`.glass`** — the single glass recipe (translucent fill, hairline border,
  `backdrop-filter` blur+saturate, inner highlight, accent-tinted shadow). Has a
  `[data-theme="light"]` variant. Every card/panel uses it.
- **`[data-reveal]` / `.is-revealed`** — the reveal transitions with `rise` and
  `emerge` variants and a `--reveal-delay` custom property for stagger.
- **`.rail-dot`** — the section-indicator dots; the active dot swells and lights
  with the cube accent; hover shows a label.
- **Motion tokens** (`--ease-standard`, `--dur-*`, `--reveal-dur`) mirror the
  engine's `config/tokens.ts` so page motion and cube motion share one feel.
- **A11y/reduced-motion**: `:focus-visible` ring on all interactive surfaces,
  `scroll-padding-top` for the sticky nav, and a `prefers-reduced-motion` block
  that disables reveals, smooth scroll, button motion and the cube fade.

---

## 5. Adding or reordering a scene

You are adding a *station on the journey*, not a renderer. Steps:

1. **Content** — add/adjust the section `include` with a unique `id`. Keep it
   transparent and drop a `<div class="cube-scrim"></div>` as its first child.
   Include it in `home.html` in the desired order.
2. **Reveal** — tag content with `data-reveal` (or `="rise"`/`="emerge"`) and set
   `style="--reveal-delay:Nms"` for stagger.
3. **Beat** — add an entry to `BEATS` in `landing.ts` mapping the section `id` to a
   cube `state` (an existing module, or a new one you registered per
   `03-rendering-engine.md` §5). Set `accent`, and `rest`/`camera` if relevant.
4. **Rail** — add a matching `<a data-rail="id" data-label="…" class="rail-dot">`
   in `home.html`.
5. **Rebuild** `landing.bundled.js` and the CSS (see getting-started), then verify
   the transition and that scrolling back reverses it.

**Do not** add a second canvas/engine, and **do not** encode motion values in the
template or controller — reach for a module + camera preset + tokens.

---

## 6. Reduced motion — what the visitor gets

`prefers-reduced-motion: reduce` is respected at every layer:

- **Cube** holds its calm resting form. `applyBeat` skips `transitionTo`, camera
  moves and looping resting energy; it still lights the accent and marks the active
  rail dot, so theming and wayfinding stay intact. Hover and acknowledge pulses are
  suppressed.
- **Page** disables reveal animation, smooth in-page scrolling (`spa-nav.js` jumps
  instantly), button press motion, and the canvas fade.

This is a genuine "no large motion" experience, not merely a slower one.

---

## 7. Performance notes (as shipped)

- One RAF loop; one engine `frame()`; instanced/pooled cube, energy and particles.
  `QualityManager` adapts DPR and shadow tier from live FPS.
- The cube canvas is `transparent` and always partly visible through the scrims, so
  it is never wastefully drawn behind a fully opaque layer.
- Full teardown on `pagehide`. Background tabs rely on the browser throttling RAF.
- **Known trade-off (documented, intentional):** the loop is *not* paused on
  `visibilitychange`. `StandaloneRuntime.start()` re-runs the initial transition,
  so pausing/resuming that way would reset the journey. A proper fix needs an engine
  `pause()/resume()` that preserves state — that is new engine feature work, not a
  page tweak.

---

## 8. Invariants to protect

- One canvas, one engine, one loop. If a change adds a second of any, it is wrong.
- Every scene section: transparent + `.cube-scrim` + content in a `z-10` context.
- Beats are derived from viewport dominance → reversibility is free; don't replace
  the observer with manual scroll-position math.
- Motion lives in `config/tokens.ts` (cube) and the `--ease/--dur` tokens (page).
  The Motion Bible is the source; code cites it.

---

## 9. The hero constellation

The hero frames the cube as the **core of a living interface**, not a hero with
decorative screenshots. Three pieces, none of which add a renderer or touch the
engine:

1. **Camera** — the hero beat carries a `camera` preset that pulls the lens closer
   than the idle default (`[0,0.8,6]` → `[0,0.45,4.6]`), so the one cube reads
   large and central. It is still a long, calm lens (Motion Bible §7.7) and is
   applied by the existing `cameraRig` — no engine change.
2. **Nodes** — real glass UI components (`.hero-node`), not images: Telegram, CRM,
   Задачи, Аналитика, AI-агент, Интеграции, plus the metrics panel. They orbit the
   cube left/right/bottom inside `.hero-constellation` (`aria-hidden`, decorative;
   the headline/CTAs/metrics/scroll cue carry the real, accessible content). Each
   uses the shared glass recipe and shows subtle live data (counters, a graph,
   status, progress, notification dots).
3. **Energy links** — `static/desktop/js/hero-composition.js` draws one base +
   one travelling-pulse SVG `<path>` from the cube's screen centre to each node and
   keeps them glued to the fixed cube via a rAF loop gated by an
   `IntersectionObserver` (paused when the hero scrolls away). The pulse travel and
   the node's arrival reaction are **pure CSS**, synchronised by `animation-delay`
   (`--delay` per node) — so "energy reaches the card, the card lights" needs no JS
   timing. `pathLength="100"` normalises the dash animation across every link length.

**Reduced motion:** links hold still (`.hero-link-pulse` hidden), no live data
ticks, cards and graph rest at static values. **Performance:** geometry is a few
path-string writes per frame while the hero is visible, then it stops; the flow
animation pauses off-screen. It is composition only — the invariants in §8 still
hold (one canvas, one engine, one loop).
