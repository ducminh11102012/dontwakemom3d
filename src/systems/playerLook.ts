/**
 * playerLook.ts
 * -------------
 * Shared mutable look state (Phase 1).
 *
 * PlayerCamera writes `yaw` / `pitch` from mouse movement; PlayerController
 * reads `yaw` to make WASD movement camera-relative. A module-level singleton
 * (not the zustand store) because these values change every mouse event and
 * must never trigger React re-renders.
 */

import { SPAWN_YAW } from '../constants';

export const playerLook = {
  /** Rotation around Y in radians. 0 = looking down -Z. */
  yaw: SPAWN_YAW,
  /** Rotation around X in radians, clamped to ±PITCH_CLAMP. */
  pitch: 0,
};

export function resetPlayerLook() {
  playerLook.yaw = SPAWN_YAW;
  playerLook.pitch = 0;
}
