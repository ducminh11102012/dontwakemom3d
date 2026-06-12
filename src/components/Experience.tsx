/**
 * Experience.tsx
 * --------------
 * Scene root (Phase 1). Composition:
 *  - near-absolute black background (falling out of the map is instantly
 *    visible as black void → easy collision-bug detection)
 *  - Rapier physics world
 *  - PlayerCamera (look + pointer lock) and PlayerController (body + movement)
 *  - FloorLayout modular 5×5 grid level (Phase 2)
 *  - PostFX pipeline
 *
 * The Phase 0 placeholder/test content is gone entirely.
 */

import { Physics } from '@react-three/rapier';
import PlayerCamera from './PlayerCamera';
import PlayerController from './PlayerController';
import FloorLayout from './canvas/Level/FloorLayout';
import PostFX from './PostFX';

export default function Experience() {
  return (
    <>
      {/* Near-absolute black: outside the room there is only void. */}
      <color attach="background" args={['#020203']} />

      {/* Barely-there ambient — rooms are lit by their own fixtures. */}
      <ambientLight intensity={0.05} color="#aab4c4" />

      <PlayerCamera />

      <Physics gravity={[0, -9.81, 0]}>
        <PlayerController />
        <FloorLayout />
      </Physics>

      <PostFX />
    </>
  );
}
