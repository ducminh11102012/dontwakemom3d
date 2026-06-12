/**
 * PlayerCamera.tsx — mouse look + pointer-lock lifecycle.
 * Look only (PlayerController owns position). Adds panic/chase hand-shake.
 */

import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MOUSE_SENSITIVITY, PITCH_CLAMP } from '../constants';
import { useGameStore } from '../state/gameStore';
import { playerLook } from '../systems/playerLook';
import { runtime } from '../game/runtime';

export default function PlayerCamera() {
  const gl = useThree((s) => s.gl);
  const gamePhase = useGameStore((s) => s.gamePhase);

  // manual mouse-look while locked
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      playerLook.yaw -= e.movementX * MOUSE_SENSITIVITY;
      playerLook.pitch -= e.movementY * MOUSE_SENSITIVITY;
      playerLook.pitch = Math.max(-PITCH_CLAMP, Math.min(PITCH_CLAMP, playerLook.pitch));
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [gl]);

  // request lock when entering play (the triggering click is the gesture)
  useEffect(() => {
    if (gamePhase === 'playing' && document.pointerLockElement !== gl.domElement) {
      gl.domElement.requestPointerLock?.();
    }
    if ((gamePhase === 'caught' || gamePhase === 'ending' || gamePhase === 'menu') &&
        document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [gamePhase, gl]);

  // losing lock during play = pause
  useEffect(() => {
    const onChange = () => {
      const s = useGameStore.getState();
      if (document.pointerLockElement !== gl.domElement && s.gamePhase === 'playing') {
        s.setGamePhase('paused');
      }
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [gl]);

  useFrame(({ camera, clock }) => {
    camera.rotation.order = 'YXZ';
    let shake = 0;
    if (runtime.stress >= 95 || runtime.momState === 'chase') shake = 0.004;
    else if (runtime.stress >= 81) shake = 0.0018;
    const t = clock.elapsedTime;
    const jx = shake * Math.sin(t * 31.7) * Math.sin(t * 13.1);
    const jy = shake * Math.sin(t * 27.3) * Math.cos(t * 11.7);
    camera.rotation.set(playerLook.pitch + jx, playerLook.yaw + jy, 0);
  });

  return null;
}
