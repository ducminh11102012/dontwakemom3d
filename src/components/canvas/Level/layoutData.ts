/**
 * layoutData.ts
 * -------------
 * The 5×5 floor grid definition + door-consistency validation (Phase 2 §2.5).
 * Kept separate from FloorLayout.tsx so the component file only exports a
 * component (react-refresh requirement).
 */

import { type RoomType } from '../../../constants';
import type { DoorSpec } from './types';

export interface CellDef {
  type: Exclude<RoomType, 'void'>;
  doors: DoorSpec;
}

const C = (type: CellDef['type'], doors: DoorSpec): CellDef => ({ type, doors });

/**
 * 5×5 grid (null = void). Deviations from the raw brief, required for a
 * consistent floor (documented in PHASE_2_NOTES.md):
 *  - [2][2] restroom gained an EAST door (brief: w,s) — without it the
 *    elevator wing [2][3]/[2][4] is sealed off and [2][3].w faces a wall.
 *  - [4][2] loop hallway gained a NORTH door (brief: w,e) — [3][2].s pointed
 *    at a wall, and this also makes [4][2] IDENTICAL to [2][1] (n,w,e),
 *    which §2.6.3 demands for the loop illusion.
 */
export const LAYOUT: (CellDef | null)[][] = [
  // row 0
  [null, C('breakroom', { south: true, east: true }), C('hallway', { west: true, east: true }), C('server', { west: true }), null],
  // row 1
  [null, C('hallway', { north: true, south: true }), null, null, null],
  // row 2 — SPAWN at [2][0]
  [C('cubicle', { east: true, south: true }), C('hallway', { north: true, west: true, east: true }), C('restroom', { west: true, south: true, east: true }), C('hallway', { west: true, east: true }), C('elevator', { west: true })],
  // row 3
  [C('hallway', { north: true, south: true }), null, C('hallway', { north: true, south: true }), null, null],
  // row 4 — LOOP-EXIT at [4][2]
  [C('cubicle', { north: true, east: true }), C('hallway', { west: true, east: true }), C('hallway', { north: true, west: true, east: true }), C('hallway', { west: true }), null],
];

const LOOP_EXIT: [number, number] = [4, 2];

// ── Validation (§2.5) ───────────────────────────────────────────────────────

const DIRS = [
  { key: 'north', dr: -1, dc: 0, opp: 'south' },
  { key: 'south', dr: 1, dc: 0, opp: 'north' },
  { key: 'east', dr: 0, dc: 1, opp: 'west' },
  { key: 'west', dr: 0, dc: -1, opp: 'east' },
] as Array<{ key: keyof DoorSpec; dr: number; dc: number; opp: keyof DoorSpec }>;

/** Every door must face a neighbor with the matching opposite door —
 *  except the east door of the LOOP-EXIT cell. Returns a list of problems. */
export function validateLayout(layout: (CellDef | null)[][]): string[] {
  const errors: string[] = [];
  layout.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return;
      for (const { key, dr, dc, opp } of DIRS) {
        if (!cell.doors[key]) continue;
        if (r === LOOP_EXIT[0] && c === LOOP_EXIT[1] && key === 'east') continue;
        const neighbor = layout[r + dr]?.[c + dc];
        if (!neighbor) {
          errors.push(`[${r}][${c}] ${cell.type}: door ${key} leads into void`);
        } else if (!neighbor.doors[opp]) {
          errors.push(
            `[${r}][${c}] ${cell.type}: door ${key} not matched by [${r + dr}][${c + dc}] ${neighbor.type}.${opp}`,
          );
        }
      }
    });
  });
  return errors;
}

