# CUB LAB — Getting Started

**Developer setup, build & workflow**
Owner: Frontend / Platform · Status: Living document

This is the practical guide to running, building and extending CUB LAB. For the
*why*, read the architecture docs alongside it:

- `../architecture/01-foundation.md` — product & technical architecture
- `../architecture/02-creative-direction.md` — the **Motion Bible** (the law for motion)
- `../architecture/03-rendering-engine.md` — the Cube Engine
- `../architecture/04-landing-experience.md` — the landing page that consumes it

---

## 1. Prerequisites

- **Python** via **[uv](https://docs.astral.sh/uv/)** — the project pins its
  interpreter; always run Python through `uv run` so you get the pinned version.
  > Do **not** use a bare system `python`. A mismatched interpreter (e.g. 3.14,
  > which removed the stdlib `cgi` module Django imports) fails at import time.
  > This is an environment mismatch, not a code bug — `uv run` avoids it.
- **Node.js** (with npm) — for the CSS and JavaScript build tools.
- A **WebGL2-capable** browser to see the cube (the page degrades gracefully
  without it).

---

## 2. Install

```bash
# Python deps (Django, etc.) — resolved & run through uv
uv sync                # or: uv run python -c "import django; print(django.VERSION)"

# Node deps at the repo root (Tailwind CLI + esbuild)
npm install

# Cube Engine dev deps (TypeScript, three types, R3F types) — for typechecking
cd packages/cube-engine && npm install && cd ../..
```

---

## 3. Project layout (top level)

```
CubeConsalting/
├── config/  core/            Django project + the home view (UA → desktop/mobile)
├── templates/
│   ├── desktop/              home.html + include/*.html  ← the cube experience
│   └── mobile/               separate mobile tree (not the cube experience)
├── static/
│   ├── src/                  Tailwind entrypoints: desktop.css, base.css, mobile.css
│   └── desktop/
│       ├── css/desktop.css        BUILT stylesheet (do not hand-edit)
│       ├── js/landing.ts          the Landing Experience controller (source)
│       ├── js/landing.bundled.js  BUILT bundle actually served (do not hand-edit)
│       └── img/                    referenced assets only (no orphans)
├── packages/cube-engine/     @cublab/cube-engine (framework-agnostic engine)
└── docs/                     you are here
```

**Build outputs are committed** (`desktop.css`, `landing.bundled.js`) because the
Django app serves static files directly. Never edit them by hand — edit the source
and rebuild.

---

## 4. Build commands (from the repo root)

Defined in the root `package.json`:

```bash
npm run build           # build desktop + mobile CSS (Tailwind, minified)
npm run build:landing   # bundle static/desktop/js/landing.ts → landing.bundled.js (esbuild)
npm run build:assets    # build (CSS) + build:landing  ← run this before committing assets
```

Watch mode while developing styles:

```bash
npm run dev:desktop     # tailwind --watch on static/src/desktop.css
```

> **esbuild gotcha:** always run the bundle command **from the repo root**.
> `landing.ts` imports the engine by a relative path (`../../../packages/...`);
> running esbuild from another working directory breaks resolution. `npm run
> build:landing` sets the right paths — prefer it over calling esbuild by hand.

Typecheck the engine (must be clean before committing):

```bash
cd packages/cube-engine && ./node_modules/.bin/tsc --noEmit
```

Typecheck the controller (esbuild does **not** typecheck):

```bash
./packages/cube-engine/node_modules/.bin/tsc --noEmit --strict --skipLibCheck \
  --moduleResolution bundler --module esnext --target es2020 \
  --lib es2020,dom,dom.iterable static/desktop/js/landing.ts
```

---

## 5. Run

```bash
uv run python manage.py runserver
# open http://127.0.0.1:8000/  (send a desktop User-Agent to get the cube page)
```

The home view sniffs the UA: mobile devices get `mobile/home.html`; everything
else gets the desktop cube experience.

---

## 6. Verify (the suite to run before shipping)

```bash
uv run python manage.py check                 # Django config — expect "0 issues"
npm run build:assets                          # CSS + bundle — expect clean
cd packages/cube-engine && ./node_modules/.bin/tsc --noEmit && cd ../..   # engine types

# smoke test the page + assets
uv run python manage.py runserver 127.0.0.1:8000 --noreload &
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/                       # 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/static/desktop/js/landing.bundled.js
```

For Lighthouse (performance/accessibility), run it against the live dev server:

```bash
npx lighthouse http://127.0.0.1:8000/ --view
```

Checklist expectations: one `<h1>`, no 404s in the server log, `lang="ru"`,
present meta/OG tags, focus-visible rings, and no motion under
`prefers-reduced-motion`.

---

## 7. Common tasks

### Extend the Cube Engine
Add a **module**, never a second renderer. See `03-rendering-engine.md` §5:
implement `CubeModule`, register it, express all motion via `config/tokens.ts`.

### Add or reorder a landing scene
See `04-landing-experience.md` §5: add a transparent section with a
`.cube-scrim`, tag content with `data-reveal`, add a `BEATS` entry + a `rail-dot`,
then rebuild.

### Add a glass surface / card
Use the shared `.glass` class (do not invent new glass CSS) and `[data-reveal]`
for entrance. Keep spacing on the existing responsive scale (`px-6 md:px-12
lg:px-20`).

### Change a colour or font
Colours are CSS variables in `static/src/base.css` (`:root` / `[data-theme=…]`)
surfaced to Tailwind via `@theme` in `static/src/desktop.css`. The engine's own
palette lives in `packages/cube-engine/src/config/tokens.ts` (`PALETTE`). Keep the
two in sync when changing brand colour.

---

## 8. Preserving the Motion Bible

The Motion Bible (`02-creative-direction.md`) is the source of truth for how CUB
LAB moves. To keep it intact as the codebase grows:

- **No magic numbers.** Every duration, easing, FOV, damping and breathing value
  lives in `config/tokens.ts` (cube) or the `--ease/--dur/--reveal` custom
  properties in `base.css` (page). Reference them; when you need a new value, add
  it there with a one-line Motion-Bible citation.
- **The cube leads.** Interactions originate from the cube (hover, scroll, theme).
  Page motion should echo the cube's easing, not compete with it.
- **Continuity over cuts.** Transitions morph (via engine damping); nothing fades
  in from nowhere or teleports. New scenes must reverse cleanly on scroll-up.
- **Restraint.** Motion communicates; it never decorates. If an animation doesn't
  carry meaning, remove it.
- **Reduced motion is first-class.** Any new motion must have a
  `prefers-reduced-motion` path (see `04-landing-experience.md` §6).

---

## 9. Conventions

- Commit source **and** the rebuilt artefacts (`desktop.css`, `landing.bundled.js`)
  in the same change, so the served site matches the source.
- Keep the tree free of dead code and orphaned assets — every file in
  `static/desktop/img/` must be referenced; every JS file must be loaded by a
  template.
- Branch from `main`; commit messages follow Conventional Commits
  (`feat`, `refactor`, `docs`, …).
