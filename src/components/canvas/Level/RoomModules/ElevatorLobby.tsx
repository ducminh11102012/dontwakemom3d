/**
 * ElevatorLobby.tsx
 * -----------------
 * 8×8 m elevator lobby (Phase 2 §2.4): one wall carries flat metal elevator
 * doors (metalness 0.6, roughness 0.3) with a lit orange call button.
 * 2 steady, bright fixtures — no flicker.
 *
 * The elevator doors sit on the EAST wall (the dead end of the floor —
 * the elevator that is not coming back).
 */

import { RigidBody } from '@react-three/rapier';
import { CELL_SIZE, WALL_HEIGHT } from '../../../../constants';
import type { RoomModuleProps } from '../types';
import CellShell from '../primitives/CellShell';
import FluorescentFixture from '../primitives/FluorescentFixture';

const HALF = CELL_SIZE / 2;

export default function ElevatorLobby({ position, doors, walls }: RoomModuleProps) {
  const [swX, swZ] = position;
  const cx = swX + HALF;
  const cz = swZ - HALF;

  return (
    <group>
      <CellShell position={position} doors={doors} walls={walls} />

      <RigidBody type="fixed" colliders="cuboid" position={[cx, 0, cz]}>
        {/* Elevator door slab, flush against the east wall. */}
        <mesh position={[HALF - 0.12, 1.2, 0]}>
          <boxGeometry args={[0.08, 2.4, 2.4]} />
          <meshStandardMaterial
            color="#9aa2a8"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        {/* Center seam between the two door leaves. */}
        <mesh position={[HALF - 0.165, 1.2, 0]}>
          <boxGeometry args={[0.02, 2.4, 0.03]} />
          <meshStandardMaterial color="#3c4146" roughness={0.5} />
        </mesh>
        {/* Door frame */}
        <mesh position={[HALF - 0.1, 2.5, 0]}>
          <boxGeometry args={[0.1, 0.2, 2.6]} />
          <meshStandardMaterial color="#6f767c" metalness={0.5} roughness={0.4} />
        </mesh>
      </RigidBody>

      {/* Call button panel with a lit orange button. */}
      <group position={[cx + HALF - 0.18, 0, cz + 1.6]}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[0.04, 0.3, 0.12]} />
          <meshStandardMaterial color="#5b6166" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[-0.025, 1.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.025, 12]} />
          <meshStandardMaterial
            color="#ffb35c"
            emissive="#ff8c1a"
            emissiveIntensity={2}
          />
        </mesh>
      </group>

      {/* Two bright steady fixtures. */}
      <FluorescentFixture position={[cx - 1.8, WALL_HEIGHT - 0.05, cz]} />
      <FluorescentFixture position={[cx + 1.8, WALL_HEIGHT - 0.05, cz]} />
    </group>
  );
}
