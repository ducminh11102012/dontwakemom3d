/**
 * ServerRoom.tsx
 * --------------
 * 8×8 m server room (Phase 2 §2.4): 2 m tall rack rows forming 1.2 m aisles,
 * small green emissive LEDs (THREE.InstancedMesh — one draw call for all),
 * NO ceiling fixture — only a single dim green point light (0.3-equivalent).
 */

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { RigidBody } from '@react-three/rapier';
import { CELL_SIZE } from '../../../../constants';
import type { RoomModuleProps } from '../types';
import CellShell from '../primitives/CellShell';

const HALF = CELL_SIZE / 2;

const RACK = { width: 0.8, height: 2, depth: 5.6 };
/** Rack row center X offsets — faces are 1.2 m apart (aisle width). */
const ROW_XS = [-3.0, -1.0, 1.0, 3.0];
const LEDS_PER_ROW = 7;
const LED_COUNT = ROW_XS.length * LEDS_PER_ROW;

export default function ServerRoom({ position, doors, walls }: RoomModuleProps) {
  const [swX, swZ] = position;
  const cx = swX + HALF;
  const cz = swZ - HALF;
  const ledsRef = useRef<THREE.InstancedMesh>(null);

  // Place LED instances once: scattered down the east face of each rack row.
  useLayoutEffect(() => {
    const mesh = ledsRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    let i = 0;
    for (const rowX of ROW_XS) {
      for (let l = 0; l < LEDS_PER_ROW; l++) {
        const z = -RACK.depth / 2 + 0.5 + l * ((RACK.depth - 1) / (LEDS_PER_ROW - 1));
        const y = 0.5 + ((l * 7919) % 13) * 0.1; // deterministic pseudo-scatter
        m.setPosition(rowX + RACK.width / 2 + 0.011, y, z);
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      <CellShell position={position} doors={doors} walls={walls} />

      {/* Rack rows — each row is one stretched box with its own collider. */}
      <RigidBody type="fixed" colliders="cuboid" position={[cx, 0, cz]}>
        {ROW_XS.map((x, i) => (
          <mesh key={i} position={[x, RACK.height / 2, 0]}>
            <boxGeometry args={[RACK.width, RACK.height, RACK.depth]} />
            <meshStandardMaterial
              color="#1a1d1f"
              roughness={0.6}
              metalness={0.4}
            />
          </mesh>
        ))}
      </RigidBody>

      {/* Green status LEDs — instanced, one draw call. */}
      <group position={[cx, 0, cz]}>
        <instancedMesh ref={ledsRef} args={[undefined, undefined, LED_COUNT]}>
          <boxGeometry args={[0.022, 0.022, 0.022]} />
          <meshStandardMaterial
            color="#0c200f"
            emissive="#2aff6a"
            emissiveIntensity={2.2}
          />
        </instancedMesh>
      </group>

      {/* NO ceiling fixture. Single dim green point light only. */}
      <pointLight
        position={[cx, 2.2, cz]}
        color="#3dff7a"
        intensity={3.5} // physical-units equivalent of the brief's 0.3
        distance={8}
        decay={2}
      />
    </group>
  );
}
