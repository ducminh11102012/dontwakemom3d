/**
 * constants.ts
 * ------------
 * Central tuning constants for THE NINTH FLOOR.
 * Per section 0.6 of the project brief, ALL gameplay numbers (movement speeds,
 * sanity thresholds, noise levels, AI ranges, ...) must live here so that every
 * phase references the exact same values. Later phases will extend this file —
 * never scatter magic numbers across components.
 */

// ── Meta ────────────────────────────────────────────────────────────────────
export const GAME_TITLE = 'THE NINTH FLOOR';
export const GAME_VERSION = '0.1.0-phase1';

// ── Player movement (Phase 1 final values) ──────────────────────────────────
export const PLAYER_WALK_SPEED = 2.6; // m/s — slow, heavy office walk
export const PLAYER_CROUCH_SPEED = 1.3; // m/s
export const PLAYER_SPRINT_SPEED = 5.0; // m/s

// ── Player body (Phase 1) ───────────────────────────────────────────────────
export const PLAYER_RADIUS = 0.32; // m, capsule collider radius
export const PLAYER_HEIGHT = 1.7; // m, standing height
export const PLAYER_CROUCH_HEIGHT = 1.0; // m, crouched height
export const PLAYER_CAMERA_OFFSET = 0.15; // m, eye sits this far below the top of the head
export const PLAYER_CROUCH_TRANSITION_SPEED = 8; // lerp speed for camera height changes

/**
 * The physics capsule ALWAYS uses the crouch height (see PHASE_1_NOTES.md):
 * total capsule height = 2 * halfHeight + 2 * radius = PLAYER_CROUCH_HEIGHT.
 */
export const PLAYER_CAPSULE_HALF_HEIGHT =
  (PLAYER_CROUCH_HEIGHT - 2 * PLAYER_RADIUS) / 2; // 0.18 m
/** Distance from capsule center to capsule bottom (feet). */
export const PLAYER_CAPSULE_HALF_TOTAL =
  PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_RADIUS; // 0.5 m

// ── Stamina (Phase 1) ───────────────────────────────────────────────────────
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_PER_SECOND = 14; // while sprinting
export const STAMINA_REGEN_PER_SECOND = 10; // while not sprinting
export const STAMINA_SPRINT_THRESHOLD = 5; // cannot START a sprint below this

// ── Mouse look (Phase 1) ────────────────────────────────────────────────────
export const MOUSE_SENSITIVITY = 0.0022; // rad per px of mouse movement
export const PITCH_CLAMP = (85 * Math.PI) / 180; // ±85° pitch clamp

// ── Test room (Phase 1 — replaced by the module system in Phase 2) ─────────
export const TEST_ROOM_SIZE = 6; // m, inner floor is 6×6
export const TEST_ROOM_HEIGHT = 2.7; // m, floor to ceiling
export const TEST_ROOM_WALL_THICKNESS = 0.15; // m

// ── Sanity system (PHASE_4_TODO: wired in Phase 4) ──────────────────────────
export const SANITY_MAX = 100;
export const SANITY_START = 100;
export const SANITY_TIER_UNEASY = 70; // below this: subtle PostFX
export const SANITY_TIER_PANIC = 40; // below this: strong distortion, heartbeat
export const SANITY_TIER_CRITICAL = 15; // below this: extreme effects

// ── Noise events (PHASE_3_TODO: emitted by footstep/audio system) ───────────
export const NOISE_CROUCH = 0.2;
export const NOISE_WALK = 0.5;
export const NOISE_SPRINT = 1.0;

// ── Flashlight (PHASE_6_TODO) ───────────────────────────────────────────────
export const FLASHLIGHT_BATTERY_MAX = 100;

// ── Performance budget (section 0.7, rule 4) ────────────────────────────────
export const TARGET_FPS = 60;
