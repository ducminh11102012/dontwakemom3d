/**
 * PlayerController.tsx
 * --------------------
 * FPS movement + physics body (Phase 1). The most important piece of Phase 1.
 *
 * Physics:
 *  - Dynamic rigidbody, rotations locked, linear damping against sliding.
 *  - Capsule collider that ALWAYS keeps the crouch size; only the camera
 *    height changes when crouching (anti-stuck strategy, see PHASE_1_NOTES.md).
 *  - Spawns near the center of the test room.
 *
 * Movement (every frame):
 *  - Read input refs, pick speed: crouch → CROUCH, sprint+stamina → SPRINT,
 *    otherwise WALK.
 *  - Direction is relative to camera yaw; diagonals normalized.
 *  - Velocity is written directly to the rigidbody (Y preserved for gravity).
 *
 * Stamina:
 *  - Sprint drains, otherwise regen. Cannot START below the threshold;
 *    reaching 0 force-cancels the sprint. Store only updated when the
 *    rounded value actually changes.
 *
 * Camera follow:
 *  - Camera tracks the rigidbody; eye height lerps between standing and
 *    crouch (PLAYER_CROUCH_TRANSITION_SPEED), never snaps.
 *
 * NO JUMP — by design the game has no jump input and no vertical impulse.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import {
  PLAYER_CAMERA_OFFSET,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_HALF_TOTAL,
  PLAYER_CROUCH_HEIGHT,
  PLAYER_CROUCH_SPEED,
  PLAYER_CROUCH_TRANSITION_SPEED,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPRINT_SPEED,
  PLAYER_WALK_SPEED,
  STAMINA_DRAIN_PER_SECOND,
  STAMINA_MAX,
  STAMINA_REGEN_PER_SECOND,
  STAMINA_SPRINT_THRESHOLD,
} from '../constants';
import { useGameStore } from '../state/gameStore';
import { useInput } from '../systems/useInput';
import { playerLook } from '../systems/playerLook';

/** Eye height above the player's FEET, standing / crouched. */
const STAND_EYE_HEIGHT = PLAYER_HEIGHT - PLAYER_CAMERA_OFFSET; // 1.55 m
const CROUCH_EYE_HEIGHT = PLAYER_CROUCH_HEIGHT - PLAYER_CAMERA_OFFSET; // 0.85 m

/** Spawn near the center of the test room (slightly off-center, facing in). */
const SPAWN_POSITION: [number, number, number] = [
  0.4,
  PLAYER_CAPSULE_HALF_TOTAL + 0.05,
  0.6,
];

export default function PlayerController() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const inputRef = useInput();

  // Per-frame values live in refs — never React state (section 0.6).
  const staminaRef = useRef(STAMINA_MAX);
  const isSprintingRef = useRef(false);
  const eyeHeightRef = useRef(STAND_EYE_HEIGHT);

  useFrame(({ camera }, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    // Clamp delta: a background tab can produce huge deltas on resume.
    const dt = Math.min(delta, 1 / 20);
    const input = inputRef.current;
    const store = useGameStore.getState();
    const playing = store.gamePhase === 'playing';

    // ── Resolve stance & sprint state ───────────────────────────────────────
    const crouching = playing && input.crouch;
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    let sprinting = isSprintingRef.current;
    const wantsSprint = playing && input.sprint && isMoving && !crouching;
    if (!wantsSprint) {
      sprinting = false;
    } else if (!sprinting) {
      // May only START sprinting with enough stamina in reserve.
      sprinting = staminaRef.current > STAMINA_SPRINT_THRESHOLD;
    }

    // ── Stamina drain / regen ───────────────────────────────────────────────
    if (sprinting) {
      staminaRef.current = Math.max(
        0,
        staminaRef.current - STAMINA_DRAIN_PER_SECOND * dt,
      );
      if (staminaRef.current <= 0) sprinting = false; // exhausted → auto-cancel
    } else {
      staminaRef.current = Math.min(
        STAMINA_MAX,
        staminaRef.current + STAMINA_REGEN_PER_SECOND * dt,
      );
    }
    isSprintingRef.current = sprinting;

    // ── Movement velocity (camera-yaw relative, normalized diagonals) ───────
    const speed = crouching
      ? PLAYER_CROUCH_SPEED
      : sprinting
        ? PLAYER_SPRINT_SPEED
        : PLAYER_WALK_SPEED;

    const currentVel = body.linvel();
    let vx = 0;
    let vz = 0;
    if (playing && isMoving) {
      const yaw = playerLook.yaw;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      // forward = (-sin, -cos), right = (cos, -sin) in the XZ plane.
      let dirX = -sin * moveZ + cos * moveX;
      let dirZ = -cos * moveZ - sin * moveX;
      const len = Math.hypot(dirX, dirZ);
      dirX /= len;
      dirZ /= len;
      vx = dirX * speed;
      vz = dirZ * speed;
    }
    // Y velocity is preserved — gravity only. There is NO jump in this game.
    body.setLinvel({ x: vx, y: currentVel.y, z: vz }, true);

    // ── Camera follow + smooth crouch (lerp, never instant) ─────────────────
    const targetEye = crouching ? CROUCH_EYE_HEIGHT : STAND_EYE_HEIGHT;
    const t = Math.min(1, PLAYER_CROUCH_TRANSITION_SPEED * dt);
    eyeHeightRef.current += (targetEye - eyeHeightRef.current) * t;

    const pos = body.translation();
    const feetY = pos.y - PLAYER_CAPSULE_HALF_TOTAL;
    camera.position.set(pos.x, feetY + eyeHeightRef.current, pos.z);

    // ── Push to store ONLY when values actually changed ─────────────────────
    const roundedStamina = Math.round(staminaRef.current * 10) / 10;
    if (roundedStamina !== store.stamina) store.setStamina(roundedStamina);
    if (crouching !== store.isCrouching) store.setIsCrouching(crouching);
    if (sprinting !== store.isSprinting) store.setIsSprinting(sprinting);
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={SPAWN_POSITION}
      enabledRotations={[false, false, false]} // never rotate the capsule
      linearDamping={0.5} // mild damping against residual sliding
      ccd // continuous collision detection — never tunnel through walls
    >
      {/*
        Capsule permanently at CROUCH size (total height = PLAYER_CROUCH_HEIGHT).
        Only the camera moves when changing stance — see PHASE_1_NOTES.md.
        args = [halfHeight (cylinder part), radius]
      */}
      <CapsuleCollider
        args={[PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_RADIUS]}
        friction={0} // walls must not grab the player
      />
    </RigidBody>
  );
}
