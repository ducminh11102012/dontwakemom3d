/**
 * CellShell.tsx
 * -------------
 * Common 8×8 m cell envelope used by every room module (Phase 2): carpet
 * floor, tile ceiling and the cell's border walls (with door openings).
 *
 * Wall deduplication: shared borders between two cells must only be rendered
 * once — FloorLayout decides ownership (each cell owns its N and W walls;
 * S/E only on the grid edge or next to void) and passes it via `walls`.
 *
 * Doors always open at the wall center (doorOffset = CELL_SIZE / 2).
 */

import { useMemo } from 'react';
import {
  createCarpetTexture,
  createCeilingTileTexture,
  createWallpaperTexture,
} from '../../../../utils/proceduralTextures';
import { CELL_SIZE } from '../../../../constants';
import type { DoorSpec, WallSpec } from '../types';
import Wall from './Wall';
import FloorSlab from './FloorSlab';
import CeilingSlab from './CeilingSlab';

export interface CellShellProps {
  /** SW corner of the cell: [x = minX, z = maxZ]. */
  position: [number, number];
  doors: DoorSpec;
  walls: WallSpec;
}

const HALF = CELL_SIZE / 2;
const DOOR_AT_CENTER = CELL_SIZE / 2;

export default function CellShell({ position, doors, walls }: CellShellProps) {
  const [swX, swZ] = position;
  const cx = swX + HALF;
  const cz = swZ - HALF;

  const textures = useMemo(
    () => ({
      carpet: createCarpetTexture(),
      ceiling: createCeilingTileTexture(),
      wallpaper: createWallpaperTexture(),
    }),
    [],
  );

  return (
    <group>
      <FloorSlab
        width={CELL_SIZE}
        depth={CELL_SIZE}
        position={[cx, 0, cz]}
        texture={textures.carpet}
      />
      <CeilingSlab
        width={CELL_SIZE}
        depth={CELL_SIZE}
        position={[cx, 0, cz]}
        texture={textures.ceiling}
      />

      {walls.north && (
        <Wall
          length={CELL_SIZE}
          position={[cx, 0, cz - HALF]}
          rotationY={0}
          doorOffset={doors.north ? DOOR_AT_CENTER : undefined}
          texture={textures.wallpaper}
        />
      )}
      {walls.south && (
        <Wall
          length={CELL_SIZE}
          position={[cx, 0, cz + HALF]}
          rotationY={0}
          doorOffset={doors.south ? DOOR_AT_CENTER : undefined}
          texture={textures.wallpaper}
        />
      )}
      {walls.west && (
        <Wall
          length={CELL_SIZE}
          position={[cx - HALF, 0, cz]}
          rotationY={Math.PI / 2}
          doorOffset={doors.west ? DOOR_AT_CENTER : undefined}
          texture={textures.wallpaper}
        />
      )}
      {walls.east && (
        <Wall
          length={CELL_SIZE}
          position={[cx + HALF, 0, cz]}
          rotationY={Math.PI / 2}
          doorOffset={doors.east ? DOOR_AT_CENTER : undefined}
          texture={textures.wallpaper}
        />
      )}
    </group>
  );
}
