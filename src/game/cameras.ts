/**
 * cameras.ts — CCTV security cameras (v1.5 feature).
 *
 * A monitor bank lives in the upstairs Security Room (the former Study). It
 * streams live feeds from a handful of fixed cameras dotted around the house.
 * Coverage is DELIBERATELY incomplete: each camera has a narrow-ish field of
 * view mounted in a corner, and most rooms have no camera at all — so there
 * are always blind spots Mom (and the player) can slip through.
 *
 * The feeds are real render-to-texture views of the live scene, so anything
 * that walks in front of a camera shows up on the monitors. No special AI
 * hooks — it is emergent.
 */

import type { Level, RoomId } from './house';

export interface SecurityCam {
  id: string;
  /** label baked under the monitor */
  label: string;
  /** world position of the lens */
  pos: [number, number, number];
  /** world point the lens aims at */
  look: [number, number, number];
  /** vertical field of view (deg) — narrow = more blind spots */
  fov: number;
  level: Level;
  room: RoomId;
  /** horizontal sweep amplitude in degrees (0 / omitted = fixed camera) */
  panDeg?: number;
  /** sweep angular speed (rad/s); period ≈ 2π / panSpeed */
  panSpeed?: number;
  /** sweep phase offset so cameras don't move in sync */
  panPhase?: number;
}

/** The upstairs room that holds the monitor bank. */
export const SECURITY_ROOM: RoomId = 'upStudy';

/**
 * Five cameras watching the busiest / most dangerous spaces. Note what is NOT
 * covered: storage, bathroom, the player's own room, and every other upstairs
 * room — all blind. Even watched rooms keep blind corners (e.g. behind the
 * sofa, under the beds), and the panning ones sweep their blind spot around so
 * Mom drifts in and out of frame.
 */
export const SECURITY_CAMS: SecurityCam[] = [
  // Main artery: the ground-floor hallway + Mom's creaky door. Sweeps.
  { id: 'cam_hall', label: 'CAM 1 · HALLWAY', pos: [9.9, 2.42, 4.5], look: [5.4, 1.1, 6.6], fov: 60, level: 0, room: 'hallway', panDeg: 20, panSpeed: 0.5, panPhase: 0 },
  // Living room — but the SE corner (behind the sofa) stays off-frame. Sweeps.
  { id: 'cam_living', label: 'CAM 2 · LIVING RM', pos: [8.4, 2.42, 12.6], look: [1.5, 0.8, 9.7], fov: 58, level: 0, room: 'living', panDeg: 16, panSpeed: 0.42, panPhase: 1.5 },
  // Kitchen down toward the foot of the stairs. Fixed stare.
  { id: 'cam_kitchen', label: 'CAM 3 · KITCHEN', pos: [10.9, 2.42, 0.45], look: [14.2, 0.6, 7.6], fov: 56, level: 0, room: 'kitchen' },
  // Mom's bedroom: watches the bed + nightstand (NOT under the bed). Fixed.
  { id: 'cam_mom', label: "CAM 4 · MOM'S RM", pos: [4.7, 2.42, 8.6], look: [1.3, 0.6, 5.0], fov: 54, level: 0, room: 'momRoom' },
  // Upstairs hallway, the only second-floor camera. Wide sweep.
  { id: 'cam_uphall', label: 'CAM 5 · UPSTAIRS', pos: [0.4, 5.3, 4.95], look: [13.5, 4.1, 8.2], fov: 64, level: 1, room: 'upHall', panDeg: 24, panSpeed: 0.6, panPhase: 3.0 },
];
