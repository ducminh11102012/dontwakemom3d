# PHASE_1_NOTES

## What was implemented

- **Physics world**: `@react-three/rapier` `<Physics gravity={[0,-9.81,0]}>`
  wrapping the player and the test room.
- **`src/systems/useInput.ts`**: keyboard input hook backed by a **ref**
  (never state — zero re-renders). Tracks `forward / backward / left / right /
  sprint / crouch / interact / flashlight / holdBreath`. Bindings: WASD +
  Arrow Keys, Shift = sprint, Ctrl or C = crouch (hold), E = interact,
  F = flashlight, B = hold breath. **Escape is intentionally not tracked
  here** — pause/unlock goes through the native pointer-lock Escape handling.
- **`src/systems/playerLook.ts`**: module-level mutable `{ yaw, pitch }`
  singleton. Camera writes it, movement reads `yaw`. Not in zustand because it
  changes per mouse event.
- **`src/components/PlayerCamera.tsx`**: drei `PointerLockControls` used
  **only** for lock/unlock (`pointerSpeed={0}` disables its built-in look).
  Rotation handled manually from `mousemove` deltas with
  `MOUSE_SENSITIVITY = 0.0022`; pitch clamped to ±85°; camera Euler order is
  always `'YXZ'` (no roll possible). Lock → `gamePhase 'playing'`,
  unlock/Escape → `'paused'`.
- **`src/components/PlayerController.tsx`**: dynamic rigidbody, rotations
  locked, `linearDamping 0.5`, CCD on, friction-0 capsule collider, spawns
  near room center. Per-frame: input → speed selection (crouch 1.3 /
  sprint 5.0 / walk 2.6 m/s) → camera-yaw-relative direction (normalized
  diagonals) → `setLinvel` with Y preserved (gravity only). Camera follows the
  body; eye height lerps (speed 8) between 1.55 m and 0.85 m
  (height − 0.15 camera offset). **No jump exists anywhere.**
- **Stamina**: max 100, drain 14/s sprinting, regen 10/s otherwise. Sprint
  cannot **start** below 5; hitting 0 force-cancels it (hysteresis via ref).
- **Store additions**: `stamina`, `isCrouching`, `isSprinting` + setters,
  initialized to `100 / false / false`, included in `resetRun()`.
- **`src/components/CubicleBayTest.tsx`**: sealed 6×6×2.7 m room, 0.15 m
  walls. Fixed rigidbody with auto-cuboid colliders on floor, ceiling and all
  4 walls. Dark brown carpet, dirty-white walls, very weak ambient + one cold
  blue-white fluorescent point light with an emissive fixture mesh.
- **`src/components/Experience.tsx`**: near-black background (`#020203`),
  Physics, PlayerCamera, PlayerController, CubicleBayTest, PostFX. Phase 0
  placeholder content fully removed.
- **`src/components/PostFX.tsx`**: `EffectComposer` + light `Vignette` only —
  establishes the pipeline for later phases.
- **`src/App.tsx` + `App.css`**: fullscreen canvas, CSS reset (from Phase 0's
  `index.css`), "Click to Play" overlay shown whenever the pointer is not
  locked; any click locks and enters the game; Escape unlocks and pauses.
  This overlay is the stand-in menu until Phase 8.

## Known limitations / deliberate decisions

1. **Capsule collider is permanently crouch-sized** (total height
   `PLAYER_CROUCH_HEIGHT = 1.0 m`, halfHeight 0.18, radius 0.32). Resizing a
   capsule on stance change is a classic source of get-stuck-in-ceiling bugs,
   so only the **camera** moves between 1.55 m and 0.85 m eye height.
   Consequence: the player physically fits through crouch-height gaps even
   while standing. Phase 2+ level design / the future interaction system must
   gate low passages by *camera stance*, not by collider size, if that
   matters for gameplay (e.g., desk-crawl detection should check
   `isCrouching`, not the collider).
2. **Stamina updates the store continuously** while draining/regenerating
   (only when the 0.1-rounded value changes, so ~10 writes/s during sprint,
   and any `stamina` subscriber re-renders that often). If the Phase 3+ HUD
   profiles badly, optimize by keeping stamina in a ref and
   throttling store pushes (e.g., 4 Hz) or subscribing transiently.
3. Movement uses direct `setLinvel` (Y preserved) rather than forces —
   exact speeds, instant stop, no sliding; `linearDamping 0.5` additionally
   kills residual drift. Vertical damping is negligible here (sealed room,
   no falls).
4. Sprint requires actual movement input and not crouching; holding Shift
   while stationary does not drain stamina.
5. Phase 0 note flagged that brief section 0.5 was missing; the proposed
   structure from `docs/PHASE_0_BRIEF.md` § 0.5 was followed and still fits.

## Verification

- `npm run build` (tsc -b + vite) — clean, no type errors.
- `npm run lint` — clean.
- Headless browser smoke test: app boots, overlay renders, canvas + WebGL
  context created, physics world initialized, no console errors.
- Manual checklist mapping in `docs/` brief: pointer lock, mouse look ±85°,
  WASD camera-relative, collision (no wall/floor penetration, CCD on),
  sprint > walk, stamina drain/regen + threshold + auto-cancel, smooth crouch
  camera lerp, Escape pause/unlock, cold dark room mood.

## What Phase 2 should expect to find

- `src/components/CubicleBayTest.tsx` is **throwaway** — replace with the
  real module system; keep the collider pattern (fixed rigidbody +
  `colliders="cuboid"`).
- Spawn position lives in `PlayerController.tsx` (`SPAWN_POSITION`) — Phase 2
  should move spawn selection into level data.
- `playerLook.yaw/pitch` is the canonical look direction for anything that
  needs "where is the player facing" (AI vision checks, interaction raycasts
  can also use `camera.getWorldDirection`).
- Store now exposes `stamina`, `isCrouching`, `isSprinting` for HUD/noise
  systems; noise emission (NOISE_* constants) is still unwired (Phase 3).
- Input hook already tracks `interact` / `flashlight` / `holdBreath` — wire
  edge-detection (pressed-this-frame) when those features arrive.
