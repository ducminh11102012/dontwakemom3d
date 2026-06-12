/**
 * CeilingSlab.tsx
 * ---------------
 * Ceiling-tile plane at y = WALL_HEIGHT facing down. No collider — the player
 * (1.7 m) can never reach 2.7 m and colliders cost physics time (Phase 2 §2.3).
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { WALL_HEIGHT } from '../../../../constants';

export interface CeilingSlabProps {
  width: number;
  depth: number;
  /** World position of the slab center at floor level (y = 0). */
  position: [number, number, number];
  texture: THREE.Texture;
}

export default function CeilingSlab({ width, depth, position, texture }: CeilingSlabProps) {
  const map = useMemo(() => {
    const t = texture.clone();
    // One 64px tile per ~2 m feels like real 600mm office tiles at this scale.
    t.repeat.set(width / 8, depth / 8);
    return t;
  }, [texture, width, depth]);

  return (
    <mesh
      position={[position[0], WALL_HEIGHT, position[2]]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={map} roughness={0.95} />
    </mesh>
  );
}
