/**
 * CubicleBayTest.tsx
 * ------------------
 * Phase 1 sealed test room — 6×6 m, 2.7 m high, 0.15 m thick walls.
 *
 * Purpose: validate movement, collision and FPS feel. Phase 2 replaces this
 * with the real office module system.
 *
 * Mood (deliberately cold / liminal, NOT friendly):
 *  - dark brown office carpet
 *  - dirty-white walls, slightly grimy ceiling
 *  - very weak ambient + one blue-white fluorescent fixture
 *
 * Every surface (floor, ceiling, 4 walls) has an exact cuboid collider via
 * a single fixed rigidbody with auto "cuboid" colliders.
 */

import { RigidBody } from '@react-three/rapier';
import {
  TEST_ROOM_HEIGHT,
  TEST_ROOM_SIZE,
  TEST_ROOM_WALL_THICKNESS,
} from '../constants';

const S = TEST_ROOM_SIZE; // 6 — inner width/depth
const H = TEST_ROOM_HEIGHT; // 2.7 — inner height
const T = TEST_ROOM_WALL_THICKNESS; // 0.15
const HALF = S / 2;

// Materials — cheap, rough, office-grade.
const CARPET_COLOR = '#241b12'; // dark brown carpet
const WALL_COLOR = '#9b968a'; // dirty white
const CEILING_COLOR = '#878276'; // slightly grimier ceiling tiles

export default function CubicleBayTest() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid">
        {/* Floor — top face at y = 0 */}
        <mesh position={[0, -T / 2, 0]}>
          <boxGeometry args={[S + 2 * T, T, S + 2 * T]} />
          <meshStandardMaterial color={CARPET_COLOR} roughness={1} />
        </mesh>

        {/* Ceiling — bottom face at y = H */}
        <mesh position={[0, H + T / 2, 0]}>
          <boxGeometry args={[S + 2 * T, T, S + 2 * T]} />
          <meshStandardMaterial color={CEILING_COLOR} roughness={0.95} />
        </mesh>

        {/* North wall (-Z) */}
        <mesh position={[0, H / 2, -(HALF + T / 2)]}>
          <boxGeometry args={[S + 2 * T, H, T]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
        </mesh>

        {/* South wall (+Z) */}
        <mesh position={[0, H / 2, HALF + T / 2]}>
          <boxGeometry args={[S + 2 * T, H, T]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
        </mesh>

        {/* West wall (-X) */}
        <mesh position={[-(HALF + T / 2), H / 2, 0]}>
          <boxGeometry args={[T, H, S]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
        </mesh>

        {/* East wall (+X) */}
        <mesh position={[HALF + T / 2, H / 2, 0]}>
          <boxGeometry args={[T, H, S]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
        </mesh>
      </RigidBody>

      {/* ── Lighting: cold office fluorescent, barely enough ────────────── */}
      <ambientLight intensity={0.06} color="#aab4c4" />

      {/* The fluorescent tube fixture (visual only, no collider needed). */}
      <mesh position={[0, H - 0.04, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.3]} />
        <meshStandardMaterial
          color="#dfe8f2"
          emissive="#cfe0f5"
          emissiveIntensity={1.6}
        />
      </mesh>
      <pointLight
        position={[0, H - 0.25, 0]}
        color="#cfe0f5" // blue-white fluorescent
        intensity={14}
        distance={9}
        decay={1.8}
        castShadow={false}
      />
    </group>
  );
}
