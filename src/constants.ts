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
export const GAME_VERSION = '0.0.0-phase0';

// ── Player movement (PHASE_1_TODO: validate these once the controller exists)
export const PLAYER_WALK_SPEED = 3.2; // m/s — slow, heavy office walk
export const PLAYER_SPRINT_SPEED = 5.6; // m/s
export const PLAYER_CROUCH_SPEED = 1.6; // m/s
export const PLAYER_HEIGHT = 1.7; // m, standing eye height ~1.62
export const PLAYER_CROUCH_HEIGHT = 1.0; // m
export const PLAYER_RADIUS = 0.35; // m, capsule collider radius

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
