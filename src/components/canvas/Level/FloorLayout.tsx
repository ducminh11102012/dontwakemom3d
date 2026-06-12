/**
 * FloorLayout.tsx
 * ---------------
 * Grid-based level (Phase 2 §2.5–2.6): 5×5 LAYOUT matrix, door validation,
 * wall ownership dedup, and the non-Euclidean loop corridor.
 *
 * Direction convention: North = -Z, East = +X, South = +Z, West = -X.
 * Cell [row][col] spans X ∈ [col*8, col*8+8], Z ∈ [row*8, row*8+8].
 *
 * Loop mechanic (§2.6): an invisible sensor at the east end of hallway
 * [4][2] teleports the player (only while moving +X) to just past the west
 * sensor of hallway [2][1], at the peak of a 250 ms screen flash. Both
 * hallways are geometrically identical T-junctions (n,w,e), so the jump is
 * visually undetectable. Yaw/camera are untouched. See PHASE_2_NOTES.md.
 */

import { useEffect, useRef } from 'react';
import {
  CuboidCollider,
  RigidBody,
  type IntersectionEnterPayload,
} from '@react-three/rapier';
import {
  CELL_SIZE,
  LOOP_SENSOR_EAST,
  LOOP_SENSOR_WEST,
  LOOP_TARGET_X,
  LOOP_DELTA_Z,
  LOOP_TELEPORT_AT_MS,
} from '../../../constants';
import { useGameStore } from '../../../state/gameStore';
import type { RoomModuleProps, WallSpec } from './types';
import { LAYOUT, validateLayout, type CellDef } from './layoutData';
import CubicleBay from './RoomModules/CubicleBay';
import Hallway from './RoomModules/Hallway';
import BreakRoom from './RoomModules/BreakRoom';
import Restroom from './RoomModules/Restroom';
import ServerRoom from './RoomModules/ServerRoom';
import ElevatorLobby from './RoomModules/ElevatorLobby';

// ── Wall ownership dedup ────────────────────────────────────────────────────

/** A cell renders N/W always; S/E only when no neighbor cell exists there. */
function wallsFor(layout: (CellDef | null)[][], r: number, c: number): WallSpec {
  return {
    north: true,
    west: true,
    south: !layout[r + 1]?.[c],
    east: !layout[r]?.[c + 1],
  };
}

const MODULES: Record<CellDef['type'], (props: RoomModuleProps) => React.JSX.Element> = {
  cubicle: CubicleBay,
  hallway: Hallway,
  breakroom: BreakRoom,
  restroom: Restroom,
  server: ServerRoom,
  elevator: ElevatorLobby,
};

// ── Component ───────────────────────────────────────────────────────────────

export default function FloorLayout() {
  const teleportLockRef = useRef(false);

  // Automatic door-consistency validation (§2.5).
  useEffect(() => {
    const errors = validateLayout(LAYOUT);
    if (errors.length > 0) {
      errors.forEach((e) => console.error(`[FloorLayout] door mismatch: ${e}`));
    } else {
      console.info('[FloorLayout] layout validation passed ✔');
    }
  }, []);

  // §2.6 — east sensor of [4][2]: teleport while moving +X, at flash peak.
  const onLoopEnter = (payload: IntersectionEnterPayload) => {
    const body = payload.other.rigidBody;
    if (!body) return;
    const userData = body.userData as { isPlayer?: boolean } | undefined;
    if (!userData?.isPlayer) return;
    if (body.linvel().x <= 0) return; // only when moving east (+X)
    if (teleportLockRef.current) return;
    teleportLockRef.current = true;

    useGameStore.getState().triggerLoopFlash();
    setTimeout(() => {
      // Translate: fixed X landing just past [2][1]'s west sensor; Z shifted
      // by the corridor-center delta (yaw/camera untouched — camera follows
      // the body, look direction lives in playerLook).
      const p = body.translation();
      body.setTranslation(
        { x: LOOP_TARGET_X, y: p.y, z: p.z + LOOP_DELTA_Z },
        true,
      );
      setTimeout(() => {
        teleportLockRef.current = false;
      }, 400);
    }, LOOP_TELEPORT_AT_MS);
  };

  return (
    <group>
      {LAYOUT.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const Module = MODULES[cell.type];
          // SW corner: [minX, maxZ] of the cell.
          const position: [number, number] = [c * CELL_SIZE, (r + 1) * CELL_SIZE];
          return (
            <Module
              key={`${r}-${c}`}
              position={position}
              doors={cell.doors}
              walls={wallsFor(LAYOUT, r, c)}
            />
          );
        }),
      )}

      {/* Invisible loop sensors (§2.6). Only the EAST one teleports; the
          WEST one is the landing anchor (and a future reverse-loop hook). */}
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{ isLoopTrigger: true }}
        position={LOOP_SENSOR_EAST}
      >
        <CuboidCollider
          args={[0.12, 1.3, 1.5]}
          sensor
          onIntersectionEnter={onLoopEnter}
        />
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{ isLoopTrigger: true }}
        position={LOOP_SENSOR_WEST}
      >
        <CuboidCollider args={[0.12, 1.3, 1.5]} sensor />
      </RigidBody>
    </group>
  );
}
