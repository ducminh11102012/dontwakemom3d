/**
 * CubicleBay.tsx
 * --------------
 * 8×8 m open-plan cubicle bay (Phase 2 §2.4): four 1.3 m partitions arranged
 * as a pinwheel around the cell center (with colliders), 4 desks + box
 * chairs, 2 fluorescent fixtures (one flickering).
 */

import { RigidBody } from '@react-three/rapier';
import { CELL_SIZE, WALL_HEIGHT } from '../../../../constants';
import type { RoomModuleProps } from '../types';
import CellShell from '../primitives/CellShell';
import FluorescentFixture from '../primitives/FluorescentFixture';

const HALF = CELL_SIZE / 2;

const PARTITION = { length: 3, height: 1.3, thickness: 0.06 };

/** Pinwheel partitions, local to cell center: [x, z, rotated 90°?]. */
const PARTITIONS: Array<[number, number, boolean]> = [
  [0.5, -1.5, true], // north arm (along Z)
  [1.5, 0.5, false], // east arm (along X)
  [-0.5, 1.5, true], // south arm (along Z)
  [-1.5, -0.5, false], // west arm (along X)
];

/** Desk + chair per quadrant: desk [x, z, rotY], chair tucked beside it. */
const DESKS: Array<[number, number, number]> = [
  [-2.2, -2.4, 0],
  [2.4, -2.2, Math.PI / 2],
  [2.2, 2.4, Math.PI],
  [-2.4, 2.2, -Math.PI / 2],
];

export default function CubicleBay({ position, doors, walls }: RoomModuleProps) {
  const [swX, swZ] = position;
  const cx = swX + HALF;
  const cz = swZ - HALF;

  return (
    <group>
      <CellShell position={position} doors={doors} walls={walls} />

      {/* Furniture — one fixed body, auto cuboid collider per mesh. */}
      <RigidBody type="fixed" colliders="cuboid" position={[cx, 0, cz]}>
        {PARTITIONS.map(([x, z, rotated], i) => (
          <mesh
            key={`p${i}`}
            position={[x, PARTITION.height / 2, z]}
            rotation={[0, rotated ? Math.PI / 2 : 0, 0]}
          >
            <boxGeometry
              args={[PARTITION.length, PARTITION.height, PARTITION.thickness]}
            />
            <meshStandardMaterial color="#7d7568" roughness={0.95} />
          </mesh>
        ))}

        {DESKS.map(([x, z, rotY], i) => (
          <group key={`d${i}`} position={[x, 0, z]} rotation={[0, rotY, 0]}>
            {/* Desk top */}
            <mesh position={[0, 0.74, 0]}>
              <boxGeometry args={[1.4, 0.05, 0.7]} />
              <meshStandardMaterial color="#6b5a44" roughness={0.85} />
            </mesh>
            {/* Desk legs (single slab each side) */}
            <mesh position={[-0.65, 0.36, 0]}>
              <boxGeometry args={[0.05, 0.72, 0.66]} />
              <meshStandardMaterial color="#4e4232" roughness={0.9} />
            </mesh>
            <mesh position={[0.65, 0.36, 0]}>
              <boxGeometry args={[0.05, 0.72, 0.66]} />
              <meshStandardMaterial color="#4e4232" roughness={0.9} />
            </mesh>
            {/* Box chair */}
            <mesh position={[0, 0.25, 0.75]}>
              <boxGeometry args={[0.45, 0.5, 0.45]} />
              <meshStandardMaterial color="#3d3a35" roughness={0.95} />
            </mesh>
          </group>
        ))}
      </RigidBody>

      {/* Two tube fixtures; the first one flickers. */}
      <FluorescentFixture
        position={[cx - 1.8, WALL_HEIGHT - 0.05, cz]}
        flicker
      />
      <FluorescentFixture position={[cx + 1.8, WALL_HEIGHT - 0.05, cz]} />
    </group>
  );
}
