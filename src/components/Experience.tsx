/**
 * Experience.tsx
 * --------------
 * Scene root (Phase 1). Composition:
 *  - near-absolute black background (falling out of the map is instantly
 *    visible as black void → easy collision-bug detection)
 *  - Rapier physics world
 *  - PlayerCamera (look + pointer lock) and PlayerController (body + movement)
 *  - CubicleBayTest sealed test room
 *  - PostFX pipeline
 *
 * The Phase 0 placeholder/test content is gone entirely.
 */

import { Physics } from '@react-three/rapier';
import PlayerCamera from './PlayerCamera';
import PlayerController from './PlayerController';
import CubicleBayTest from './CubicleBayTest';
import PostFX from './PostFX';

export default function Experience() {
  return (
    <>
      {/* Near-absolute black: outside the room there is only void. */}
      <color attach="background" args={['#020203']} />

      <PlayerCamera />

      <Physics gravity={[0, -9.81, 0]}>
        <PlayerController />
        <CubicleBayTest />
      </Physics>

      <PostFX />
    </>
  );
}
