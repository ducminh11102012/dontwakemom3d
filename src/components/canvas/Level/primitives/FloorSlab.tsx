/**
 * FloorSlab.tsx
 * -------------
 * Horizontal carpeted floor plane with an exact (explicit) cuboid collider,
 * wrapped in a fixed rigidbody (Phase 2 §2.3).
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { CuboidCollider, RigidBody } from '@react-three/rapier';

export interface FloorSlabProps {
  width: number;
  depth: number;
  /** World position of the slab center at floor level (y = 0). */
  position: [number, number, number];
  texture: THREE.Texture;
}

export default function FloorSlab({ width, depth, position, texture }: FloorSlabProps) {
  const map = useMemo(() => {
    const t = texture.clone();
    t.repeat.set(width / 2, depth / 2);
    return t;
  }, [texture, width, depth]);

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={map} roughness={1} />
      </mesh>
      {/* Thin explicit cuboid just below the visual plane. */}
      <CuboidCollider args={[width / 2, 0.05, depth / 2]} position={[0, -0.05, 0]} />
    </RigidBody>
  );
}
