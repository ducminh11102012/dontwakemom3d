/**
 * Wall.tsx
 * --------
 * Shared wall primitive (Phase 2 §2.3).
 *
 * - No `doorOffset`: one fixed rigidbody + box + auto cuboid collider.
 * - With `doorOffset` (distance from wall start = local -X end to the door
 *   CENTER): the wall splits into 3 independent fixed bodies — left segment,
 *   right segment (skipped when ≤ 0.05 m) and the lintel above the doorway
 *   (height − DOOR_HEIGHT, sitting at DOOR_HEIGHT).
 *
 * Texture: the shared texture is CLONED per wall and tiled at
 * repeat(length/2, height/2) so the pattern density is identical everywhere.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody } from '@react-three/rapier';
import {
  DOOR_HEIGHT,
  DOOR_WIDTH,
  WALL_HEIGHT,
  WALL_THICKNESS_LEVEL,
} from '../../../../constants';

export interface WallProps {
  length: number;
  height?: number;
  thickness?: number;
  /** World position of the wall CENTER at floor level (y = 0). */
  position: [number, number, number];
  rotationY?: number;
  /** Distance from the wall start (local -X end) to the door center. */
  doorOffset?: number;
  texture: THREE.Texture;
}

interface SegmentSpec {
  length: number;
  centerX: number; // local X
  centerY: number;
  height: number;
}

export default function Wall({
  length,
  height = WALL_HEIGHT,
  thickness = WALL_THICKNESS_LEVEL,
  position,
  rotationY = 0,
  doorOffset,
  texture,
}: WallProps) {
  const map = useMemo(() => {
    const t = texture.clone();
    t.repeat.set(length / 2, height / 2);
    return t;
  }, [texture, length, height]);

  const segments = useMemo<SegmentSpec[]>(() => {
    if (doorOffset === undefined) {
      return [{ length, centerX: 0, centerY: height / 2, height }];
    }
    const start = -length / 2;
    const doorLeft = doorOffset - DOOR_WIDTH / 2;
    const doorRight = doorOffset + DOOR_WIDTH / 2;
    const segs: SegmentSpec[] = [];

    // Left segment (start → door).
    if (doorLeft > 0.05) {
      segs.push({
        length: doorLeft,
        centerX: start + doorLeft / 2,
        centerY: height / 2,
        height,
      });
    }
    // Right segment (door → end).
    const rightLen = length - doorRight;
    if (rightLen > 0.05) {
      segs.push({
        length: rightLen,
        centerX: start + doorRight + rightLen / 2,
        centerY: height / 2,
        height,
      });
    }
    // Lintel above the doorway.
    const lintelHeight = height - DOOR_HEIGHT;
    if (lintelHeight > 0.05) {
      segs.push({
        length: DOOR_WIDTH,
        centerX: start + doorOffset,
        centerY: DOOR_HEIGHT + lintelHeight / 2,
        height: lintelHeight,
      });
    }
    return segs;
  }, [doorOffset, length, height]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {segments.map((seg, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid">
          <mesh position={[seg.centerX, seg.centerY, 0]}>
            <boxGeometry args={[seg.length, seg.height, thickness]} />
            <meshStandardMaterial map={map} roughness={0.92} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}
