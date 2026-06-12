/**
 * BreakRoom.tsx
 * -------------
 * 8×8 m break room (Phase 2 §2.4): long kitchen counter (0.6 m deep,
 * 0.9 m high), a vending machine with a self-lit front, a round table with
 * 3 box chairs, 2 steady (non-flickering) fixtures.
 */

import { RigidBody } from '@react-three/rapier';
import { CELL_SIZE, WALL_HEIGHT } from '../../../../constants';
import type { RoomModuleProps } from '../types';
import CellShell from '../primitives/CellShell';
import FluorescentFixture from '../primitives/FluorescentFixture';

const HALF = CELL_SIZE / 2;

const CHAIRS: Array<[number, number]> = [
  [-0.95, 1.0],
  [-2.45, 1.2],
  [-1.6, 2.25],
];

export default function BreakRoom({ position, doors, walls }: RoomModuleProps) {
  const [swX, swZ] = position;
  const cx = swX + HALF;
  const cz = swZ - HALF;

  return (
    <group>
      <CellShell position={position} doors={doors} walls={walls} />

      <RigidBody type="fixed" colliders="cuboid" position={[cx, 0, cz]}>
        {/* Kitchen counter along the north wall: 4 m × 0.9 m × 0.6 m deep. */}
        <mesh position={[-1.6, 0.45, -3.55]}>
          <boxGeometry args={[4, 0.9, 0.6]} />
          <meshStandardMaterial color="#8c8576" roughness={0.8} />
        </mesh>
        {/* Counter top lip */}
        <mesh position={[-1.6, 0.92, -3.55]}>
          <boxGeometry args={[4.05, 0.04, 0.65]} />
          <meshStandardMaterial color="#5d574c" roughness={0.6} />
        </mesh>

        {/* Vending machine in the NE corner. */}
        <group position={[3.1, 0, -3.2]}>
          <mesh position={[0, 0.95, 0]}>
            <boxGeometry args={[0.9, 1.9, 0.8]} />
            <meshStandardMaterial color="#26323e" roughness={0.55} />
          </mesh>
          {/* Self-lit front panel (faces into the room, -X side). */}
          <mesh position={[-0.46, 1.05, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.62, 1.3]} />
            <meshStandardMaterial
              color="#9fd4e8"
              emissive="#7fc4e0"
              emissiveIntensity={1.1}
            />
          </mesh>
        </group>

        {/* Round table + 3 box chairs (SW quadrant). */}
        <group position={[-1.6, 0, 1.5]}>
          <mesh position={[0, 0.73, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.05, 20]} />
            <meshStandardMaterial color="#7a6a52" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.72, 10]} />
            <meshStandardMaterial color="#444039" roughness={0.8} />
          </mesh>
        </group>
        {CHAIRS.map(([x, z], i) => (
          <mesh key={i} position={[x, 0.25, z]}>
            <boxGeometry args={[0.45, 0.5, 0.45]} />
            <meshStandardMaterial color="#3d3a35" roughness={0.95} />
          </mesh>
        ))}
      </RigidBody>

      {/* Two steady fixtures. */}
      <FluorescentFixture position={[cx - 1.8, WALL_HEIGHT - 0.05, cz]} />
      <FluorescentFixture position={[cx + 1.8, WALL_HEIGHT - 0.05, cz]} />
    </group>
  );
}
