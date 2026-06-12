/**
 * Restroom.tsx
 * ------------
 * 8×8 m restroom (Phase 2 §2.4): two toilet stalls with 1.8 m partitions
 * along the north wall, a 2-basin sink counter on the opposite side,
 * 1 flickering fixture.
 */

import { RigidBody } from '@react-three/rapier';
import { CELL_SIZE, WALL_HEIGHT } from '../../../../constants';
import type { RoomModuleProps } from '../types';
import CellShell from '../primitives/CellShell';
import FluorescentFixture from '../primitives/FluorescentFixture';

const HALF = CELL_SIZE / 2;
const STALL_H = 1.8; // partition height
const STALL_D = 1.4; // depth from north wall
const STALL_W = 1.3; // stall width

export default function Restroom({ position, doors, walls }: RoomModuleProps) {
  const [swX, swZ] = position;
  const cx = swX + HALF;
  const cz = swZ - HALF;

  // Stall block sits against the north wall, west half (away from doors).
  const stallBackZ = -HALF + STALL_D; // front edge of the stalls
  const sideXs = [-3.6, -3.6 + STALL_W, -3.6 + 2 * STALL_W]; // 3 side panels

  return (
    <group>
      <CellShell position={position} doors={doors} walls={walls} />

      <RigidBody type="fixed" colliders="cuboid" position={[cx, 0, cz]}>
        {/* Stall side partitions (1.8 m high). */}
        {sideXs.map((x, i) => (
          <mesh key={`s${i}`} position={[x, STALL_H / 2, -HALF + STALL_D / 2]}>
            <boxGeometry args={[0.05, STALL_H, STALL_D]} />
            <meshStandardMaterial color="#a4b3ad" roughness={0.7} />
          </mesh>
        ))}
        {/* Stall front panels with door gaps. */}
        {[0, 1].map((i) => (
          <mesh
            key={`f${i}`}
            position={[sideXs[i] + STALL_W - 0.25, STALL_H / 2 + 0.15, stallBackZ]}
          >
            <boxGeometry args={[0.5, STALL_H - 0.3, 0.05]} />
            <meshStandardMaterial color="#a4b3ad" roughness={0.7} />
          </mesh>
        ))}
        {/* Toilets (simple boxes inside each stall). */}
        {[0, 1].map((i) => (
          <mesh
            key={`t${i}`}
            position={[sideXs[i] + STALL_W / 2, 0.22, -HALF + 0.45]}
          >
            <boxGeometry args={[0.45, 0.44, 0.6]} />
            <meshStandardMaterial color="#d9d6cd" roughness={0.4} />
          </mesh>
        ))}

        {/* Sink counter opposite the stalls (south side, east of the door). */}
        <group position={[1.9, 0, HALF - 0.4]}>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[2.4, 0.84, 0.55]} />
            <meshStandardMaterial color="#b9b4a8" roughness={0.6} />
          </mesh>
          {/* Two basins on top. */}
          {[-0.6, 0.6].map((x, i) => (
            <mesh key={i} position={[x, 0.88, 0]}>
              <boxGeometry args={[0.5, 0.1, 0.4]} />
              <meshStandardMaterial color="#e3e0d8" roughness={0.3} />
            </mesh>
          ))}
        </group>
      </RigidBody>

      {/* One flickering fixture. */}
      <FluorescentFixture position={[cx, WALL_HEIGHT - 0.05, cz]} flicker />
    </group>
  );
}
