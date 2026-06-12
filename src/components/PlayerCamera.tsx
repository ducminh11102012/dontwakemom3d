/**
 * PlayerCamera.tsx
 * ----------------
 * FPS mouse-look (Phase 1).
 *
 * Responsibilities — LOOK ONLY, never position (PlayerController owns that):
 *  - PointerLockControls is used EXCLUSIVELY to lock/unlock the pointer
 *    (`pointerSpeed={0}` disables its built-in rotation entirely).
 *  - Rotation is handled manually from `mousemove` deltas:
 *      yaw/pitch live in the `playerLook` ref-like singleton,
 *      pitch is clamped to ±PITCH_CLAMP (±85°),
 *      the camera Euler order is always 'YXZ' so roll can never appear.
 *  - Lock/unlock events drive gamePhase: lock → 'playing',
 *    unlock (Escape) → 'paused'.
 *
 * Yaw is exposed through `playerLook` for the movement code.
 */

import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { MOUSE_SENSITIVITY, PITCH_CLAMP } from '../constants';
import { useGameStore } from '../state/gameStore';
import { playerLook } from '../systems/playerLook';

export default function PlayerCamera() {
  const gl = useThree((s) => s.gl);
  const setGamePhase = useGameStore((s) => s.setGamePhase);

  // Manual mouse-look: only while the pointer is actually locked.
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      playerLook.yaw -= e.movementX * MOUSE_SENSITIVITY;
      playerLook.pitch -= e.movementY * MOUSE_SENSITIVITY;
      playerLook.pitch = Math.max(
        -PITCH_CLAMP,
        Math.min(PITCH_CLAMP, playerLook.pitch),
      );
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [gl]);

  // Apply yaw/pitch every frame. Euler order YXZ → yaw, then pitch, no roll.
  useFrame(({ camera }) => {
    camera.rotation.order = 'YXZ';
    camera.rotation.set(playerLook.pitch, playerLook.yaw, 0);
  });

  return (
    <PointerLockControls
      domElement={gl.domElement}
      pointerSpeed={0} // rotation is OURS; controls only lock/unlock
      onLock={() => setGamePhase('playing')}
      onUnlock={() => setGamePhase('paused')}
    />
  );
}
