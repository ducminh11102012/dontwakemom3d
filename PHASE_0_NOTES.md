# PHASE_0_NOTES

## What was implemented

- **Project scaffold**: `npm create vite@latest ninth-floor -- --template react-ts`
  (Vite 8, React 19, TypeScript 6 strict). Project lives at the repository
  root so `npm install && npm run dev` works directly after cloning.
- **Dependencies installed** (exactly per section 0.3):
  `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`,
  `@react-three/postprocessing`, `zustand`, `howler`, `leva`, and dev deps
  `@types/three`, `@types/howler` (added — howler ships no types).
- **`tsconfig.app.json`**: added `"strict": true` (the current Vite template
  no longer includes it by default; section 0.6 mandates strict typing).
- **`src/constants.ts`**: central constants file per section 0.6. Seeded with
  initial values for movement speeds, sanity tiers, noise levels, flashlight
  battery — all marked with `PHASE_X_TODO` comments; later phases tune them.
- **`src/state/gameStore.ts`**: typed zustand store skeleton with string
  literal unions for `GamePhase` (`menu | playing | paused | ending`),
  `TenantState` (`dormant | patrol | investigate | hunt | mimic`),
  `Difficulty`, `EndingType`; objective flags (`hasPhone`, `hasBadge`),
  `sanity`, `flashlightBattery`, `isHidden`, and a `resetRun()` action.
  All future-phase fields stubbed per the "no silent TODOs" rule.
- **`src/App.tsx` + CSS**: minimal Phase 0 placeholder screen (DOM only, no 3D
  yet — that's Phase 1). Proves the toolchain and store wiring; system
  monospace font, fluorescent-flicker title, per the asset strategy (0.4).
- **Empty module folders** (`src/components`, `src/systems`, `src/ui`,
  `src/utils`) with `.gitkeep`, matching the proposed structure below.
- **`docs/PHASE_0_BRIEF.md`**: the full master brief committed to the repo so
  every later phase can re-read it.
- **Boilerplate removed**: default Vite demo app, react/vite logos; custom
  favicon + page title.

## Verification

- `npx tsc -b --noEmit` (implicit in build) — no type errors.
- `npm run build` — production build succeeds.
- `npm run dev` — dev server starts cleanly, placeholder screen renders,
  no console errors.

## Deviations from spec (and why)

1. **Section 0.5 is missing from the brief as received** — the document jumps
   from 0.4 (asset strategy) to 0.6 (coding conventions), yet Phase 1 says
   "scaffold per section 0.5". A working file structure was proposed (see
   `docs/PHASE_0_BRIEF.md` § 0.5 and README). **Flagged to the project owner;
   if the original 0.5 differs, adjust at the start of Phase 1.**
2. Project scaffolded at the **repository root** (not in a `ninth-floor/`
   subfolder) so the repo itself is the standard Vite project and
   `npm run dev` works from a fresh clone.
3. Added `@types/howler` (not in the install list) — howler has no bundled
   types and strict mode would fail without it.
4. `leva` installed as a regular dependency exactly as the brief's install
   command specifies (it can move to devDependencies / be removed in the
   Phase 8 polish pass).

## What Phase 1 should expect to find

- **Files**: `src/constants.ts`, `src/state/gameStore.ts`, `src/App.tsx`
  (placeholder to replace with the R3F `<Canvas>`), empty `src/components/`,
  `src/systems/`, `src/ui/`, `src/utils/` folders.
- **Store keys**: `gamePhase`, `difficulty`, `ending`, `sanity`,
  `flashlightBattery`, `isHidden`, `hasPhone`, `hasBadge`, `tenantState`;
  actions `setGamePhase`, `setDifficulty`, `setSanity`, `setTenantState`,
  `resetRun`.
- **Constants**: `PLAYER_WALK_SPEED`, `PLAYER_SPRINT_SPEED`,
  `PLAYER_CROUCH_SPEED`, `PLAYER_HEIGHT`, `PLAYER_CROUCH_HEIGHT`,
  `PLAYER_RADIUS`, `SANITY_*`, `NOISE_*`, `FLASHLIGHT_BATTERY_MAX` — initial
  values only; Phase 1 should validate movement feel and tune.
- **Conventions in force**: strict TS, English comments with file-header
  blocks, `UPPER_SNAKE_CASE` constants centralized, zustand for all
  cross-system state, `PHASE_X_TODO` markers for stubs.
