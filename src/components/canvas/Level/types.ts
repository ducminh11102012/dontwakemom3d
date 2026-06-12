/**
 * types.ts (Level)
 * ----------------
 * Shared types for the modular level system (Phase 2).
 *
 * Direction convention (PHASE_2_NOTES.md):
 *   North = -Z, East = +X, South = +Z, West = -X.
 *   Grid cell [row][col] spans X ∈ [col*CELL, col*CELL+CELL],
 *                              Z ∈ [row*CELL, row*CELL+CELL].
 *   Module `position` prop = the cell's SW corner: [minX, maxZ].
 */

export interface DoorSpec {
  north?: boolean;
  east?: boolean;
  south?: boolean;
  west?: boolean;
}

/** Which border walls THIS cell must render (deduped by FloorLayout). */
export interface WallSpec {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

export interface RoomModuleProps {
  /** SW corner of the cell: [x = minX, z = maxZ]. */
  position: [number, number];
  doors: DoorSpec;
  walls: WallSpec;
}
