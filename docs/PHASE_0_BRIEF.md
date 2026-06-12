# PHASE 0 — PROJECT BRIEF, ROADMAP & SETUP

> **For: Claude Code Agent**
> **Project: "THE NINTH FLOOR" — 3D Liminal Horror Game**
> **Stack: Three.js via React Three Fiber (R3F), TypeScript, Vite**
>
> This is the master context document — every later phase assumes you remember
> everything here. Re-read it at the start of each phase.

---

## 0.1 — YOUR ROLE

You are acting as a senior game developer with 30 years of experience,
specializing in atmospheric horror games. You will build a complete, playable,
first-person 3D horror game in the browser using **Three.js through React
Three Fiber**. You have full creative freedom on visual details (colors, exact
dimensions, exact wording) as long as you follow the systems and structure
described here. **Do not use Godot, Unity, or any other engine.** Everything
must run via `npm run dev` in a standard Vite + React + TypeScript project.

You will receive this brief, followed by numbered build phases (Phase 1,
Phase 2, ...). Each phase is a self-contained implementation task. **Do not
skip ahead** — each phase builds on the previous one's file structure and
state management.

## 0.2 — GAME OVERVIEW (CONDENSED DESIGN)

### Title

**THE NINTH FLOOR**

### Genre

First-person psychological horror. Stealth + exploration. No combat, no
weapons.

### Elevator Pitch

You are a night-shift office cleaner. Your phone falls into the service
elevator and the elevator takes it to **Floor 9** — a floor that does not
exist on any directory. The elevator doors won't open again until you find
your phone. Floor 9 is an endless, looping liminal office space: identical
cubicles, buzzing fluorescent lights, beige carpet, and **The Tenant** —
something that lives there and does not want you to leave with what you found.

### Core Loop

```
EXPLORE → LISTEN → AVOID LIGHT/SOUND OF THE TENANT → FIND BADGE/PHONE → REACH ELEVATOR
```

Player should constantly ask:

- "Is that hum just the lights, or is it moving?"
- "Did that room exist a second ago?"
- "Where did the sound just come from?"

> **Design Rule #1**: The space itself is part of the threat — it should feel
> subtly _wrong_ (rooms repeat, doors that led somewhere now lead elsewhere).
> **Design Rule #2**: The Tenant is rarely seen directly. Its presence is
> communicated through sound, light flicker, and environmental change.
> **Design Rule #3**: Player should never feel "safe" for more than ~20
> seconds at a time, but should also have moments of false calm.

### Core Systems (built across phases)

1. First-person controller (walk / crouch / sprint) with collision
2. Modular, loopable office level (procedurally arranged from room modules)
3. Sanity meter (0-100) with escalating visual/audio distortion
4. Spatial (positional) audio system — footsteps, ambient hums, The Tenant's sounds
5. The Tenant — AI entity with state machine (Dormant, Patrol, Investigate, Hunt, Mimic)
6. Interaction system — searchable objects, hiding spots, doors
7. Objective system — find badge/phone (randomized location), then reach elevator
8. Flashlight with battery management
9. Escape sequence + multiple endings
10. Main menu, difficulty modes, HUD, restart flow

### Tone Reference

_The Backrooms_ + _Control_ (SCP-style liminal architecture) + _Don't Wake
Mom_ (sound-based stealth tension, but in 3D first-person).

## 0.3 — TECH STACK (MANDATORY — DO NOT SUBSTITUTE)

| Purpose            | Library                          | Notes                                                       |
| ------------------ | -------------------------------- | ----------------------------------------------------------- |
| Build tool         | **Vite**                         | `npm create vite@latest -- --template react-ts`             |
| 3D renderer        | **three**                        | Core engine                                                 |
| React bindings     | **@react-three/fiber**           | Scene graph as React components                             |
| Helpers            | **@react-three/drei**            | PointerLockControls, Text, Html, useTexture, etc.           |
| Physics/collision  | **@react-three/rapier**          | Player collider, raycasting for detection                   |
| Post-processing    | **@react-three/postprocessing**  | Vignette, ChromaticAberration, Noise, Bloom                 |
| Global state       | **zustand**                      | Game state, sanity, inventory, AI state                     |
| Audio              | **Howler.js** + native Web Audio API (PannerNode) | Spatial audio; Howler for simple SFX, raw WebAudio for positional Tenant audio |
| Procedural textures| **Canvas 2D API** (runtime)      | No external image assets needed                             |
| Optional debug     | **leva**                         | Debug GUI panel (can be removed before final polish)        |

### Install command (run in Phase 0)

```bash
npm create vite@latest ninth-floor -- --template react-ts
cd ninth-floor
npm install three @react-three/fiber @react-three/drei @react-three/rapier @react-three/postprocessing zustand howler
npm install -D @types/three
npm install leva
```

## 0.4 — ASSET STRATEGY (IMPORTANT — READ CAREFULLY)

**No external 3D models, textures, fonts, or audio files downloaded from the
internet.** This project has no asset pipeline and no network access for
binary assets. Instead:

- **Geometry**: Build everything from primitives (`BoxGeometry`,
  `PlaneGeometry`, `CylinderGeometry`, `ExtrudeGeometry`). Liminal office
  spaces are MOSTLY boxes. Cubicle dividers, desks, chairs, doors, vending
  machines, ceiling tiles = all boxes with correct proportions and materials.
- **Textures**: Generate procedurally at runtime using the Canvas 2D API, then
  load as `THREE.CanvasTexture`. Examples: carpet (noise + fleck pattern),
  ceiling tile (grid lines + subtle stains), wallpaper (vertical stripes +
  noise).
- **Materials**: `MeshStandardMaterial` with low `roughness`/`metalness`
  tuning for the "cheap office" look. Fluorescent lights = emissive material +
  `THREE.RectAreaLight` or `THREE.PointLight`.
- **Audio**: Generate tones/noise procedurally via Web Audio
  (`OscillatorNode`, `BiquadFilterNode`, buffer noise) where possible —
  fluorescent hum, heartbeat, static. Synthesize short filtered noise bursts
  for footsteps/Tenant steps. If a sound truly needs a sample, render it
  programmatically via an offline `AudioContext` into a `.wav` in
  `/public/audio/` — but prefer pure synthesis first.
- **Fonts/UI**: System fonts (`monospace`, `sans-serif`) via CSS/HTML overlays
  (drei's `<Html>` or plain DOM overlay outside the canvas).

This constraint is intentional — it forces a consistent, code-generated
aesthetic that fits the "liminal" theme.

## 0.5 — FILE STRUCTURE

> ⚠️ Section 0.5 was missing from the brief as received (the document jumps
> from 0.4 to 0.6). Phase 1 references "scaffold per section 0.5". Until the
> original 0.5 is provided, the structure below is the working proposal
> (documented in `PHASE_0_NOTES.md`) — replace this section with the original
> text when available.

```
src/
├── main.tsx              # Entry
├── App.tsx               # Root: game phase routing (menu / playing / ending)
├── constants.ts          # ALL tuning numbers (section 0.6)
├── state/
│   └── gameStore.ts      # zustand store — all cross-system state
├── components/           # R3F scene components (player, level, tenant, props)
├── systems/              # Non-rendering logic (audio manager, AI, noise events)
├── ui/                   # DOM overlays (HUD, menus, prompts)
└── utils/                # Procedural texture/audio generators, helpers
```

## 0.6 — CODING CONVENTIONS

- **Language**: TypeScript everywhere. Strict typing for state
  (`gameStore.ts`), AI states (string literal unions or enums), and component
  props.
- **State management**: ALL cross-system state (sanity, Tenant AI state,
  inventory/objective flags, settings/difficulty, game phase:
  `menu | playing | paused | ending`) lives in the zustand store at
  `src/state/gameStore.ts`. Components read/write via the store hook — avoid
  prop drilling.
- **Game loop**: Use `useFrame((state, delta) => {...})` from R3F for
  per-frame logic. Keep heavy logic out of render — use refs for
  frequently-changing values, only push to zustand when UI needs to react.
- **Comments**: All code comments in English. Each major file starts with a
  short comment block explaining its responsibility.
- **Naming**: Components = PascalCase. Hooks = `useXxx`. Constants =
  `UPPER_SNAKE_CASE` in `constants.ts` — centralized so later phases reference
  exact numbers.
- **No placeholder TODOs left silently** — stub future-phase references with a
  clearly commented `// PHASE_X_TODO: ...` and a no-op implementation so the
  build still compiles and runs.

## 0.7 — WORKING RULES FOR EACH PHASE

1. At the **start** of each phase, re-read the phase instructions fully before
   writing code.
2. At the **end** of each phase:
   - Run `npm run build` (or `tsc --noEmit`) to confirm no type errors.
   - Run `npm run dev` and confirm the dev server starts without runtime
     errors (check console output; screenshot the canvas if browser automation
     is available).
   - Write a short `PHASE_X_NOTES.md` in the project root summarizing what was
     implemented, any deviations from spec (and why), and what the next phase
     should expect to find (file names, exported functions, store keys).
3. **Never** remove or break functionality from a previous phase to implement
   a new one — extend, don't replace, unless the phase explicitly says to
   refactor.
4. **Performance budget**: Target 60fps on a mid-range laptop GPU. Prefer
   instancing (`THREE.InstancedMesh`) for repeated objects (ceiling tiles,
   cubicle walls) — expected from Phase 2 onward.
5. If a phase instruction is ambiguous, make the choice that best serves the
   horror atmosphere (darker, quieter, more uncertain) and note the reasoning
   in `PHASE_X_NOTES.md`.

## 0.8 — FULL ROADMAP (OVERVIEW OF ALL PHASES)

Detailed instructions for each phase arrive separately (each is a standalone
prompt, max ~16,000 characters). Use this overview to understand where each
phase fits.

- **Phase 1 — Core Engine & Player Controller**: Scaffold the Vite/R3F project
  per section 0.5, set up `<Canvas>`, pointer-lock first-person camera, WASD +
  crouch/sprint movement with Rapier collision, a single test room (one
  cubicle module) to validate movement, and an empty PostFX pipeline.
- **Phase 2 — Modular Level System & Floor Layout**: Room module library
  (cubicle bay, hallway, break room, restroom, server room, stairwell/elevator
  lobby), procedural textures (carpet, ceiling tile, wallpaper), fluorescent
  lighting, and the floor layout generator arranging modules into a loopable
  grid with the "impossible loop" mechanic.
- **Phase 3 — Audio Engine & Spatial Sound**: `AudioManager` with Web Audio
  context, positional audio (PannerNode) tied to 3D positions, ambient
  soundscape (fluorescent hum, distant HVAC, phone static), footstep noise
  system varying by movement mode + floor material, emitting "noise events"
  with intensity + position.
- **Phase 4 — Sanity System & Visual/Audio Feedback**: Sanity meter (0-100) in
  store, increase/decrease triggers, PostFX scaling (vignette, chromatic
  aberration, film grain, FOV breathing) tied to sanity tiers, heartbeat audio
  layer, "hold breath" mechanic.
- **Phase 5 — The Tenant: AI Entity & State Machine**: Tenant mesh
  (humanoid-proportioned but "wrong" — elongated limbs from stretched
  boxes/cylinders), state machine (Dormant, Patrol, Investigate, Hunt,
  Mimic/freeze), pathfinding across the room grid, hearing range (reacts to
  Phase 3 noise events), vision cone (raycasts), and audio profile.
- **Phase 6 — Interaction, Objective & Hiding Systems**: Interact prompt UI,
  searchable objects (drawers, desks, vending machine...) with phone/badge
  spawn system (randomized per run, tiered risk), hiding spots (under desks,
  server racks, supply closets), flashlight with battery drain/recharge.
- **Phase 7 — Game Loop, Escape Sequence & Endings**: Elevator/escape trigger
  once badge+phone retrieved, timed escape sequence with The Tenant actively
  hunting, multiple endings (Escaped / Caught / Secret), win/lose screens,
  restart flow, full HUD (sanity-driven, minimal).
- **Phase 8 — Main Menu, Difficulty Modes & Final Polish**: Main menu UI,
  difficulty modes (Easy/Normal/Hard affecting map hints, Tenant aggression,
  sanity decay), instancing pass for performance, final audio mix, bug pass,
  and a `README.md` with how to run/play.

**Do not proceed to Phase 1 instructions until all boxes above are checked.**

_End of Phase 0. Wait for Phase 1 instructions before continuing._
