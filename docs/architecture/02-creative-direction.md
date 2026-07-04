# CUB LAB — Creative Direction & Motion Bible

**Stage 1.5 — Creative Direction, Art Direction & Motion Language**
The permanent visual law of CUB LAB · Owner: Creative Direction · Status: Canonical
Sits on top of, and never contradicts, `01-foundation.md`. Where this document specifies a *feeling* and the architecture specifies a *mechanism*, both must be satisfied.

---

## 0. How to read this document

This is not a mood board and not a suggestion. It is the **law**. Every future prompt, every PR, every animation, every shader, every easing curve references it. When an engineer or designer is unsure how something should move, look, or feel, the answer is here — and if it isn't, the answer is derived from the **principles** here, then written back into this document.

Two reading rules:

1. **The cube is the protagonist. Everything else is supporting cast.** When a decision is ambiguous, ask "what does this do for the cube's story?" not "what looks cool here?"
2. **Numbers are law, ranges are guidance.** Where a value is given (`400ms`, `0.04 rad/s`, `24° FOV`), it is the default and must be used unless a documented reason overrides it. Where a range is given, stay inside it.

All timing and easing values map onto the motion tokens established in `01-foundation.md §12`. This document *fills those tokens with meaning* and adds the ones specific to the cube.

---

## 1. The emotional thesis

CUB LAB must not feel like a website you *read*. It must feel like a system you have *woken up*.

The single sentence that governs everything:

> **You are not visiting a product. You are being granted access to an intelligence that was already running before you arrived.**

The cube was breathing before the page loaded. It will keep breathing after you leave. You are a guest in a system that has its own life, its own calm, its own competence. It notices you. It responds to you. But it never performs *for* you the way a toy or a game does. It behaves the way a serious machine behaves when a serious person walks into the room: it acknowledges you, and continues its work.

The emotional register, in order of priority: **Calm → Trust → Curiosity → Wonder → Power → Precision.**

Calm comes first on purpose. Enterprise buyers are not seduced by noise; they are reassured by control. The wonder must arrive *through* the calm, never instead of it. A frantic, sparkly, over-animated page communicates the opposite of what an AI-infrastructure company must communicate. **Restraint is the flex.** The confidence to move slowly, to leave space, to let one thing move while everything else is still — that is what reads as expensive and intelligent.

---

## 2. The Cube — physical manifestation

The cube is the platform made visible. Not a metaphor for it — the actual, single, continuous object through which the entire platform is experienced. There is **one cube** across the whole journey (architecturally: one persistent canvas, one engine, an FSM of modules). It is never re-created between sections; it *transforms*.

**What the cube is made of, conceptually:**

- A **core** — a dense, dark, softly-lit solid at the center. This is the intelligence. It is always present, even when the cube has disassembled around it. The core is the thing that "remembers." It never fully disappears; when the cube scatters, the core dims but persists as a small point of contained light.
- A **lattice / shell** — the geometry that can assemble, tile, explode into a network, or dissolve into particles. This is the platform's *capability*: it reconfigures to become whatever the current section needs (a network, a grid of modules, a data surface).
- **Energy** — light that travels *through* the structure, never sprayed onto it. Energy moves along edges and connections like current through a circuit. It has direction and purpose. It is how the cube shows it is *thinking*.

**States the cube can occupy** (the FSM modules from the architecture, given creative meaning):

| Module | Creative meaning | Silhouette |
| --- | --- | --- |
| **Idle** | The resting mind. Breathing, listening. | A single, whole, slowly-rotating cube |
| **Network** | The platform connecting systems. | Cube expands into linked nodes |
| **Grid** | The platform's modules laid out. | Cube tiles into an ordered array of smaller cubes |
| **Assembly** | Creation — order from chaos. | Particles converge and lock into the cube |
| **Data** | The platform reasoning over information. | Cube's surface becomes a living data field |

The cube is **never** two things at once. It is always in exactly one state, transitioning cleanly to the next. This is what makes it read as *one intelligence* rather than a collection of effects.

---

## 3. The Cube as a character

Treat the cube as a real personality. If it were a person, it would be a senior engineer who is calm, exact, quietly powerful, and never wastes a movement. Every behavior below is derived from that character.

**Temperament.** Composed. Deliberate. Economical. It does not fidget. It does not perform. When it moves, it means it. It is the opposite of an excited startup mascot — it is a competent professional who has done this a thousand times.

**How fast it moves.** Slowly, by default. The idle rotation is barely perceptible. Reactions to the user are *quick to begin* (low latency, it's attentive) but *slow to settle* (it's composed, not jumpy). It accelerates gently and decelerates long. Nothing about it ever *snaps* except a single deliberate "lock" moment during Assembly, which is earned precisely because everything else is smooth.

**When it moves / when it is still.** It is **never fully static** — the breathing cycle (§7) always runs, even at rest, because a living intelligence is never frozen. But large motion only happens for a *reason*: you scrolled, you hovered, you clicked, you entered a section. Between reasons, it is calm. Stillness is a feature. A cube that is always thrashing has nothing left to say when something important happens.

**Reaction to hover.** The cube *notices*. When your pointer enters its space, the nearest region brightens subtly and leans a few degrees toward the cursor — as if turning its attention to you. This is small: a lean of **≤ 6°**, a brightness lift of **≤ 15%**, arriving in **~160ms**, receding over **~500ms** after you leave. It is acknowledgment, not excitement. The cube looks at you the way a professional glances up when you enter — then returns to composure.

**Reaction to mouse movement (no hover on the cube itself).** Even when you're not over the cube, it maintains a **gentle pointer-parallax**: the whole scene shifts by a maximum of **±2° / ±12px** toward the pointer, heavily damped (spring, low stiffness). This makes the cube feel *spatially present in the room with you* without ever feeling like it's chasing the cursor. If the pointer stops, the parallax eases back toward neutral.

**Reaction to scrolling.** Scroll is the cube's sense of *time and intention*. As you scroll, the cube reads it as a request to transform, and it transitions between states (§5). Scroll velocity modulates *intensity, not chaos*: faster scroll = slightly more energy in the transition, but the destination state is always reached cleanly. The cube is never "flung." It interprets scroll as narrative progress, not as force applied to a physics object.

**Reaction to clicking.** A click is a *command*, and the cube responds with a single, confident pulse of energy that originates at the click point and travels through the structure — a ripple of intent, not an explosion. Buttons and CTAs are felt as *the cube acting on your behalf*: the energy pulse that fires from a CTA is the same energy that lives inside the cube. Clicking anything important sends a pulse *back to the core* first, then out — the system "considers, then acts."

**Reaction to inactivity.** If you stop interacting for a while (**~12s**), the cube does not go to sleep — it goes *introspective*. The breathing slows by ~20%, energy begins to travel inward toward the core, and a very slow, very quiet internal recirculation begins: the intelligence, alone with its thoughts. The moment you move the pointer or scroll, it returns to attentive composure within **~300ms**. It was never off. It was thinking.

**Reaction to entering a new section.** The cube *leads* the transition — it always moves **first**, and the DOM content follows its cue (§6 of this doc, §7 of the architecture). Entering a section is the cube choosing to *become* what that section is about. The transformation is the headline; the text and cards arrive as consequences of it.

**Reaction to leaving a section.** The cube does not "reset." It *carries momentum* from the state it was in and morphs directly into the next. There is no return-to-neutral between sections — that would break the single-organism illusion. The only return-to-neutral is at the very top of the page (Hero) and, softened, at the very end (Footer), because those are the cube's "home."

---

## 4. Motion philosophy

**Motion is communication. Full stop.** Every movement on this platform answers one of these questions and no others:

- *What is related to what?* (connection, grouping)
- *What matters most right now?* (hierarchy, focus)
- *What just changed?* (state, transformation)
- *Where did this come from?* (origin, causality)
- *What is the system doing?* (thinking, working, waiting)

If a proposed animation does not answer one of those, it is deleted. This is the test. "It looks nice" is not an answer. "It draws the eye to the primary action" is.

**Everything animates from cause to effect, and the cause is almost always the cube.** Cards do not simply "fade in." Cards arrive *because* the cube emitted them, or *because* energy reached their position, or *because* the cube's transformation revealed the space they occupy. The user's subconscious must always be able to trace *why* something moved back to the cube or to their own action.

**Motion has weight and consequence.** Nothing in CUB LAB is weightless. Objects have mass; they accelerate and decelerate like real things. The one exception is *energy/light*, which is fast and near-massless — the contrast between heavy structure and quick light is a core part of the aesthetic (§8).

---

## 5. The Scroll Story — one continuous journey

The landing page is a **single continuous transformation of one cube**, narrated by scroll. There are no "sections" in the user's mind — there are *movements*, like in a piece of music. The cube is the through-line; the copy and UI are the annotations.

Below is the complete arc. Each beat names: the cube's state, what the cube *does*, and what the user *understands*.

**Beat 1 — HERO · "The intelligence at rest"**
Cube state: **Idle.**
The cube sits centered, whole, breathing, slowly rotating. Volumetric light rakes across it. It is calm and complete. The pointer-parallax makes it feel present. This is the cube's home pose — the single most composed image in the entire experience.
*The user understands:* this is a serious, living system. It is powerful and it is calm. (This is the 5-second impression — §11.)

**Beat 2 — SOLUTIONS · "It reaches out"**
Cube state: Idle → **Network.**
As scroll begins, the cube expands: its lattice separates into nodes connected by energy lines, forming a network that drifts outward into the space where the solutions content will live. Each solution is a node the cube extends toward. Connection lines draw *from the cube outward* — the platform reaching into the customer's systems.
*The user understands:* this platform connects to everything. It is the hub.

**Beat 3 — AUTOMATION · "It works"**
Cube state: **Network → Grid.**
The network resolves into an ordered grid of smaller cubes — modules — arranged on an invisible lattice. Energy begins to flow *between* them in sequence: one lights, passes current to the next, which triggers the next. This is a workflow executing. It is rhythmic, directional, unmistakably *a process running by itself*.
*The user understands:* this thing does work on its own. Automation is literal, visible, and calm.

**Beat 4 — ANALYTICS · "It reasons"**
Cube state: **Grid → Data.**
The grid's surface becomes a living data field — the faces of the cubes turn into a topography of values, subtle bars/curves rising from the structure, updating in place. Energy now moves as *reading* rather than *doing*: sweeping across the surface, sampling. The palette stays disciplined — data is expressed through the electric-blue accent against navy, never a rainbow.
*The user understands:* the system doesn't just act, it understands. It sees patterns.

**Beat 5 — INFRASTRUCTURE · "It is built to hold weight"**
Cube state: **Data → Grid (dense / structural).**
The cube consolidates into a denser, more architectural form — deeper shadows, heavier material, a sense of load-bearing mass and depth. The camera pulls back slightly to reveal scale. Energy is steady, quiet, constant — the hum of infrastructure that never sleeps. Less motion here, deliberately: infrastructure's virtue is that it is *boring and reliable*, and the motion communicates exactly that steadiness.
*The user understands:* this is enterprise-grade. It will not fall over. It holds.

**Beat 6 — INTEGRATIONS · "It speaks every language"**
Cube state: Grid → **Network (outward, many-to-many).**
The cube reaches out again, but now to *many* endpoints at once — a denser, more distributed network than Beat 2, with energy flowing bidirectionally along every connection. Where Solutions was "the platform reaches out," Integrations is "everything talks to everything, through the cube."
*The user understands:* it fits into my stack. It talks to my tools.

**Beat 7 — CTA · "It offers its hand"**
Cube state: **Network → Assembly.**
Everything converges. All the scattered nodes, particles, and energy rush *back* toward the center and lock into a single, whole, radiant cube — the one confident SNAP the entire experience is allowed (§3). At the instant of assembly, the primary CTA resolves into place, born from the cube's reformation. The cube, now whole and glowing with contained energy, faces the user directly.
*The user understands:* it's ready. The decision is simple. The system is inviting me in. (This is the emotional payoff — §11, end-of-page.)

**Beat 8 — FOOTER · "It returns home"**
Cube state: Assembly → **Idle (quieted).**
The cube settles back toward its resting pose, dimmed and calm — a smaller echo of the Hero. Breathing slows. The journey closes where it began: the intelligence, at rest, still alive, waiting. Footer content sits in the calm space around it.
*The user understands:* the system is still here, still running, still calm. It will be here when I come back.

**The arc as one line:** *rest → reach → work → reason → hold → connect → offer → rest.* The cube never resets mid-journey; each beat inherits the last beat's momentum. Scrolling back up runs the story in reverse, cleanly — the cube is fully reversible because it is a state machine, not a sequence of one-way effects.

---

## 6. The cube leads, the interface follows

A rule important enough for its own section, because violating it destroys the entire illusion:

> **On every transition, the cube moves first. DOM content (headings, cards, CTAs) arrives as a consequence, offset behind the cube's motion by a beat.**

The choreography per section entry:
1. `t = 0ms` — cube begins its transformation (the cause).
2. `t ≈ 120–200ms` — as the cube's new state becomes legible, its energy "reaches" the positions where content will appear.
3. `t ≈ 200–500ms` — content reveals, staggered, *from the direction the cube's energy came from*. Never a uniform fade — always a directional arrival that traces back to the cube.

Content never appears before its cause. A card that fades in on its own, unmotivated by the cube, is a bug.

---

## 7. Motion Rules — the global specification

These are defaults. They are law unless a documented override exists. All curves are described so they can be implemented in any of the three motion systems (Framer / GSAP / R3F) identically — motion must feel the same whether it's a DOM node or the cube.

### 7.1 Timing tokens (extends `01-foundation.md §12`)

| Token | Duration | Used for |
| --- | --- | --- |
| `instant` | 120ms | micro-feedback (button press, toggle) |
| `fast` | 240ms | hover states, small reveals |
| `base` | 400ms | standard content reveal, card arrival |
| `slow` | 700ms | section content transitions |
| `cinematic` | 1100–1600ms | cube state transitions between beats |
| `ambient` | 4000–8000ms+ | breathing, idle recirculation, energy loops |

### 7.2 Easing / curves

- **Standard (default for almost everything):** `cubic-bezier(0.22, 1, 0.36, 1)` — a decisive start, a long luxurious settle. This *is* the CUB LAB feel: quick to commit, slow to rest.
- **Decelerate (entrances):** `cubic-bezier(0.16, 1, 0.3, 1)` — arrives and calms.
- **Accelerate (exits):** `cubic-bezier(0.7, 0, 0.84, 0)` — leaves with intent.
- **Spring (interaction only — hover, drag, pointer-parallax):** stiffness low, damping high, **no visible bounce.** Target: reaches ~95% in ~300ms, settles fully by ~600ms. The cube is composed; it does not boing.
- **Energy/light curves** may be sharper and faster than structural curves — light is near-massless.

### 7.3 Overshoot & bounce

**Structure never overshoots.** Cube, cards, layout, camera — all settle *toward* their target and stop. The only permitted overshoot is a **single ≤3% micro-overshoot on the Assembly "lock"** (Beat 7) — one deliberate exception that makes the payoff feel earned. Everywhere else, bounce is forbidden (§10).

### 7.4 Reaction delay & momentum

- **Reaction latency (cube notices you):** ≤ 80ms. The cube is *attentive*; it must feel like it responds the instant you act.
- **Settle time (cube calms after you):** 400–600ms. Attentive to begin, composed to end.
- **Momentum between sections:** the cube carries velocity across beats; it never decelerates to zero between them.
- **Inactivity threshold:** 12s → introspective mode; return to attentive within 300ms on any input.

### 7.5 The breathing cycle (always running)

- **Period:** 5–6 seconds per full cycle (inhale + exhale), sinusoidal.
- **Scale amplitude:** ±1.5% maximum. It is *felt*, not *seen*. If you can clearly watch it pulsing, it is too much.
- **Coupled glow:** the core's emissive intensity breathes in phase with scale, ±8%.
- **Idle rotation:** ~0.04 rad/s (a full rotation takes ~2.6 minutes) around a slightly tilted Y axis. Barely perceptible drift, never a spin.
- Introspective mode slows both by ~20%.

### 7.6 Scroll intensity

- Smooth scroll (Lenis) is the only scroll. Lerp ~0.1, so motion trails the input slightly — luxurious, weighted.
- Scroll velocity maps to transition *energy* on a clamped curve: normal scroll = full clean transition; fast scroll adds ≤ 20% extra energy/light intensity but **never** changes the destination state or overshoots it.
- Parallax depth layers move at differentiated rates, max spread **8%** front-to-back. Subtle depth, not a diorama.

### 7.7 Camera

- **Default FOV:** 24–35° (long lens — flatter, more premium, less "game camera"). Hero sits near 24° for calm; Infrastructure widens slightly to show scale.
- Camera moves are **slow and rare** — reserved for beat transitions. Max translation per beat is small; the cube transforms more than the camera travels.
- Pointer-parallax on the camera: ±2° / ±12px, spring-damped (§3).
- Camera never rolls. Never spins. Never does anything a cinematographer wouldn't do with a locked-off dolly.

### 7.8 Energy, glow & connections

- **Glow is contained, never sprayed.** Emissive light lives *inside* the structure and travels along defined paths (edges, connection lines). There is no ambient bloom haze fogging the scene.
- **Connection animation:** energy travels along a line as a *pulse with a direction and a source*, at a consistent speed (~one connection-length per 400–700ms). Connections draw *on* (from source to target) and never just "appear."
- **Glow animation** is always tied to a cause: breathing, a click pulse, a workflow step firing, a hover. There is no free-running decorative glow.
- **Particle movement** is only ever *convergent* or *directional* (Assembly, energy flow). Particles never drift randomly like dust. Every particle is going somewhere for a reason, or it is not on screen.

### 7.9 `prefers-reduced-motion` (creative intent, not just compliance)

When reduced motion is requested, CUB LAB does not become lifeless — it becomes **still and dignified**. The cube holds a single beautiful composed pose per section (no transitions, no breathing, no parallax); content appears with a simple, quick opacity change (`fast`, no movement); smooth scroll becomes native scroll. The premium feeling must survive the loss of motion. A great still frame is the fallback, never a broken one.

---

## 8. Visual Language

**Lighting.** Volumetric and directional. One primary key light rakes across the cube to define its edges and give it drama; a cool hemisphere fill keeps shadows from going black; a single accent point-light in electric blue lives *near* the cube as its energy source. Lighting is cinematic and motivated — every light has a reason. The ACES filmic tone-mapping and sRGB pipeline from the architecture stay; exposure ~1.2. The scene is **dark-anchored even in light theme** around the cube — the cube always commands the most contrast on screen.

**Depth.** Real, spatial, layered. Background, mid-ground (cube), and foreground UI occupy distinct planes with genuine parallax and depth-of-field. The page has *z*. Nothing feels flat or pasted on.

**Glass.** Glassmorphism is the material of the *interface* (cards, nav, panels) — the cube is not glass, the cube is denser. Glass is frosted, with a fine 1px light-catching border, subtle inner glow, and a soft drop shadow. Blur is generous but the tint is restrained. Glass surfaces feel like *panels of a heads-up display* floating in front of the intelligence — never like frosted stickers.

**Materials.** The cube's core is a dense, dark, slightly metallic solid that drinks light. Its lattice is more reflective, catching the key light on its edges. Energy is emissive. The material contrast — heavy dark structure vs. quick bright energy — is the signature look.

**Reflections & shadows.** Soft, physically plausible, never harsh. Reflections are subtle environment reflections on the cube's edges. Shadows are soft and grounded — they give the cube weight and place it in space. No hard black shadows, no missing shadows (which make objects float meaninglessly).

**Transparency.** Used to communicate hierarchy and depth — foreground UI is more opaque, background elements recede into transparency. Transparency is never decorative; it always encodes "how close / how important is this."

**Camera angles & perspective.** Slightly above eye level, looking at the cube straight-on or a few degrees off-axis. Composed, stable, architectural. The cube is presented with the respect a museum gives a sculpture.

**Composition, spacing, negative space.** Enormous whitespace. The cube earns its power by having room to exist. Content is aligned to the invisible grid from the architecture; nothing is crowded. Negative space is not "empty" — it is the calm the wonder needs to land in. When in doubt, remove, enlarge the margins, and let the cube breathe.

**Typography behavior.** Geist for display, Inter for text (already in the repo). Type is calm and confident: large headlines with comfortable leading, minimal weights, strong hierarchy. Type **arrives, it does not perform** — reveal by directional fade tied to the cube's energy (§6), never letter-by-letter typewriter effects, never bouncing words, never gradient-animated text. Once settled, type is perfectly still and perfectly legible. Motion lives in the cube; the words are the calm counterweight.

---

## 9. Interaction Language

Every interaction is *the same system responding*. A hover on a card and a hover on the cube must feel like they come from one nervous system.

- **Hover (general):** a fast (`fast`/240ms), small acknowledgment — a lift of ≤ 4px, a brightness/border lift, the standard easing. Never a big scale jump, never a color flip. The element *leans toward attention*, matching how the cube leans toward the cursor (§3).
- **Mouse movement:** drives the global pointer-parallax (§3, §7.7). The whole scene subtly acknowledges where you are. This is the connective tissue that makes the page feel like one responsive space.
- **Touch:** the cube can be gently dragged to rotate (damped, returns toward composure on release). Tap = the click pulse (§3). No hover-dependent meaning; everything essential works on tap. Momentum on scroll matches the desktop weighted feel.
- **Focus (keyboard):** focus is *first-class and beautiful* — a clean electric-blue focus ring (a token), fully visible, never suppressed. Keyboard users get the same acknowledgment quality as pointer users. Focus moves are calm, never jumpy.
- **Scrolling:** the narrative engine (§5). Weighted, smooth, reversible.
- **Buttons:** a button press is a *command to the intelligence*. `instant` (120ms) tactile depress on press, then on release the energy pulse fires (from the cube's palette). Primary CTAs carry visible contained energy; secondary buttons are calm glass.
- **Cards:** cards arrive from the cube (§6), lift on hover, and feel like *panels the cube surfaced*. They never appear unmotivated, never all at once, never with random timing.
- **Navigation & links:** the active section is tracked (IntersectionObserver, per architecture) and the nav reflects it calmly with the accent. Navigating scrolls the story (Lenis) — you *travel* to a section, the page doesn't teleport. Links acknowledge hover with the same 240ms lean.
- **The unifying rule:** *one nervous system.* If two interactions on the page feel like they were designed by two different people, one of them is wrong.

---

## 10. DO'S — always

- The cube is **always alive** — breathing runs at all times (except reduced-motion, where a dignified still pose replaces it).
- **Animations always originate from a cause** — the cube or the user's action. Trace every motion back to its source.
- **The cube leads; the interface follows** (§6).
- **Motion always communicates** hierarchy, connection, transformation, state, or focus (§4).
- **One thing moves at a time when it matters.** Give the important motion the stage; quiet everything else.
- **Everything feels connected** — one nervous system, one palette, one timing vocabulary.
- **Restraint by default.** When unsure, do less, slower, with more space.
- **Reversibility** — scrolling up runs the story cleanly backward. The cube is a state machine, always.
- **Energy is contained and directional** — it travels through structure with purpose.
- **Whitespace is protected** — the cube needs room to be powerful.
- **Both themes are intentional and equally premium** — dark is not inverted light.
- **The still frame is always beautiful** — every paused moment should look like an intentional composition.

---

## 11. DON'TS — forbidden

- ❌ **Random fade-ins.** No unmotivated opacity animations. Every reveal has a direction and a cause.
- ❌ **Random floating / bobbing objects.** If it moves, it means something.
- ❌ **Random rotation, random glow, random particles.** "Random" is a banned word on this project.
- ❌ **Multiple competing animations.** Two things fighting for attention = zero things communicated.
- ❌ **Bounce and elastic overshoot** (except the one earned Assembly lock, §7.3).
- ❌ **Cheap neon, saturated glow haze, ambient bloom fog.** Glow is contained, never sprayed.
- ❌ **Generic SaaS effects** — gradient blobs, floating gradient orbs, tilt-on-hover cards with big shadows, marquee logo strips as decoration.
- ❌ **Gaming aesthetics / cyberpunk clichés** — HUD scanlines, glitch effects, Matrix rain, chrome-and-purple neon grids, sci-fi UI beeps.
- ❌ **Too many colors.** Blue is the identity. Data is expressed in the blue-on-navy system, not a rainbow.
- ❌ **Typewriter text, letter-by-letter, bouncing words, animated text gradients.** Type arrives and is still.
- ❌ **Loading-spinner behavior from the cube.** The cube is never a spinner, never a toy, never a mascot.
- ❌ **Camera roll, camera spin, whip-pans, dolly zooms.** Cinematography, not a rollercoaster.
- ❌ **Effects with no purpose.** If it can't answer a §4 question, it's cut.

---

## 12. Experience Goals — what the user feels, over time

**At 5 seconds.**
*"This is not a normal website."* The cube is breathing, present, calm, and clearly alive. The user feels a small, immediate hit of **wonder wrapped in calm** — curiosity without anxiety. The first impression is *competence and stillness*, not a barrage. They understand, without reading a word, that this is a serious, powerful system.

**At 15 seconds.**
The user has begun to scroll and watched the cube **reach out and transform** for the first time (Idle → Network). The realization lands: *this object is the whole page, and it's responding to me.* Curiosity deepens into engagement. They lean in. They scroll again on purpose, to see what the cube does next.

**At 30 seconds.**
Through Automation and Analytics, the user has seen the cube **work and reason** — a workflow executing, data being read. The feeling shifts to **trust and comprehension**: "I understand what this platform *does*, and I understand it because I *watched* it, not because I read a feature list." They feel the intelligence is real.

**At 60 seconds.**
Through Infrastructure and Integrations, the user feels **power and safety**: this is enterprise-grade, it holds weight, it connects to everything, it will not fall over. The wonder has matured into **confidence**. They are no longer being impressed — they are being *convinced*. They are starting to imagine it inside their own company.

**At the end of the page (CTA + Footer).**
The convergence and Assembly deliver the **emotional payoff**: everything the cube showed rushes back into one whole, radiant, ready object that faces them directly, and the CTA is born from it. The user feels **invited, not sold**. The decision feels simple and safe because the system has already demonstrated, in motion, exactly what it is. At the Footer the cube returns home, calm, still running — leaving the user with the lasting impression that **the intelligence is still there, waiting, whenever they're ready.**

The whole arc, emotionally: *notice → engage → understand → trust → decide.* If a user reaches the CTA feeling **calm and certain** rather than dazzled and exhausted, the design has succeeded.

---

## 13. The one-line law

> **CUB LAB is one calm, living intelligence — a single cube — that notices you, reaches out, works, reasons, holds, connects, and offers itself, all in one continuous motion, and never wastes a single movement doing it.**

Every future decision serves that sentence.
