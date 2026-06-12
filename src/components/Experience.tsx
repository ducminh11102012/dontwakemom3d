/**
 * Experience.tsx — everything inside the <Canvas>.
 */

import { Suspense } from 'react';
import { Physics } from '@react-three/rapier';
import House from './canvas/House';
import Mom from './canvas/Mom';
import PlayerController from './PlayerController';
import PlayerCamera from './PlayerCamera';
import PostFX from './PostFX';
import { useDirector } from '../systems/useDirector';

function Director() {
  useDirector();
  return null;
}

export default function Experience() {
  return (
    <>
      <color attach="background" args={['#06070d']} />
      <fog attach="fog" args={['#06070d', 10, 34]} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <House />
          <Mom />
          <PlayerController />
        </Physics>
      </Suspense>
      <PlayerCamera />
      <Director />
      <PostFX />
    </>
  );
}
