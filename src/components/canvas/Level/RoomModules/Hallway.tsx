/**
 * Hallway.tsx
 * -----------
 * Corridor module (Phase 2 §2.4): bare walls, ONE flickering tube at the
 * center, no furniture. The walkable corridor is CORRIDOR_WIDTH (3 m) wide —
 * inner full-height walls narrow the 8×8 cell down to the corridor.
 *
 * Supported door configurations (auto-detected):
 *  - straight N–S or E–W (incl. dead ends with a single door)
 *  - T-junction north + west + east (used by [2][1] and [4][2] — these two
 *    MUST stay geometrically identical for the non-Euclidean loop illusion).
 *
 * NOTE: the brief describes the hallway as "3×8 m, doors on short ends".
 * Because the layout also uses E/W and T-shaped hallways, this module keeps
 * the 8×8 cell footprint and builds the 3 m corridor with inner walls —
 * geometry, texture and light placement are byte-identical between instances
 * (single shared texture cache). Documented in PHASE_2_NOTES.md.
 */

import { useMemo } from 'react';
import { createWallpaperTexture } from '../../../../utils/proceduralTextures';
import { CELL_SIZE, CORRIDOR_WIDTH, WALL_HEIGHT } from '../../../../constants';
import type { RoomModuleProps } from '../types';
import CellShell from '../primitives/CellShell';
import Wall from '../primitives/Wall';
import FluorescentFixture from '../primitives/FluorescentFixture';

const HALF = CELL_SIZE / 2; // 4
const CORR_HALF = CORRIDOR_WIDTH / 2; // 1.5
/** Length of the short wall pieces between cell border and corridor side. */
const STUB = HALF - CORR_HALF; // 2.5

export default function Hallway({ position, doors, walls }: RoomModuleProps) {
  const [swX, swZ] = position;
  const cx = swX + HALF;
  const cz = swZ - HALF;
  const wallpaper = useMemo(() => createWallpaperTexture(), []);

  const n = !!doors.north;
  const s = !!doors.south;
  const w = !!doors.west;
  const e = !!doors.east;

  const isT = n && w && e && !s;
  const isNS = !isT && (n || s) && !w && !e;

  return (
    <group>
      <CellShell position={position} doors={doors} walls={walls} />

      {isT ? (
        <>
          {/* South side: unbroken full-length corridor wall. */}
          <Wall
            length={CELL_SIZE}
            position={[cx, 0, cz + CORR_HALF]}
            texture={wallpaper}
          />
          {/* North side: two stubs leaving a 3 m gap for the north branch. */}
          <Wall
            length={STUB}
            position={[cx - HALF + STUB / 2, 0, cz - CORR_HALF]}
            texture={wallpaper}
          />
          <Wall
            length={STUB}
            position={[cx + HALF - STUB / 2, 0, cz - CORR_HALF]}
            texture={wallpaper}
          />
          {/* North branch side walls. */}
          <Wall
            length={STUB}
            position={[cx - CORR_HALF, 0, cz - CORR_HALF - STUB / 2]}
            rotationY={Math.PI / 2}
            texture={wallpaper}
          />
          <Wall
            length={STUB}
            position={[cx + CORR_HALF, 0, cz - CORR_HALF - STUB / 2]}
            rotationY={Math.PI / 2}
            texture={wallpaper}
          />
        </>
      ) : isNS ? (
        <>
          {/* Straight N–S corridor: inner walls left/right. */}
          <Wall
            length={CELL_SIZE}
            position={[cx - CORR_HALF, 0, cz]}
            rotationY={Math.PI / 2}
            texture={wallpaper}
          />
          <Wall
            length={CELL_SIZE}
            position={[cx + CORR_HALF, 0, cz]}
            rotationY={Math.PI / 2}
            texture={wallpaper}
          />
        </>
      ) : (
        <>
          {/* Straight E–W corridor (incl. dead ends): inner walls N/S. */}
          <Wall
            length={CELL_SIZE}
            position={[cx, 0, cz - CORR_HALF]}
            texture={wallpaper}
          />
          <Wall
            length={CELL_SIZE}
            position={[cx, 0, cz + CORR_HALF]}
            texture={wallpaper}
          />
        </>
      )}

      {/* Exactly one flickering tube, dead center — identical everywhere. */}
      <FluorescentFixture
        position={[cx, WALL_HEIGHT - 0.05, cz]}
        rotationY={isNS ? Math.PI / 2 : 0}
        flicker
      />
    </group>
  );
}
