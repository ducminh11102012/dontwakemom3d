/**
 * house.ts — the single source of truth for the house layout (GDD §6).
 *
 * Coordinate system: X→east, Z→south, Y→up. One unit = 1 meter.
 * Footprint: 15 m × 13 m, TWO floors (v1.4).
 *
 * GROUND FLOOR (level 0):
 *   ┌──────────┬─────────────┬──────────┐ z=0
 *   │ STORAGE  │  BATHROOM   │          │
 *   ├──────────┼─────────────┤ KITCHEN  │ z=4
 *   │ MOM'S    │  HALLWAY    │ (stairs  │
 *   │ BEDROOM  │   (wood)    │  in SE)  │
 *   ├──────────┴───────┬─────┴──────────┤ z=9
 *   │   LIVING ROOM    │ PLAYER BEDROOM │
 *   └──────────────────┴────────────────┘ z=13
 *  x=0        x=5     x=9  x=10.5      x=15
 *
 * UPSTAIRS (level 1, floor at y=2.85):
 *   ┌──────────┬─────────────┬──────────┐ z=0
 *   │  STUDY   │ GUEST ROOM  │ SEWING   │
 *   ├──────────┴─────────────┴──────────┤ z=4.6
 *   │  UPSTAIRS HALLWAY      [stairwell]│ z=9
 *   ├──────────────────┬────────────────┤
 *   │   JUNK ROOM      │  LAUNDRY ROOM  │
 *   └──────────────────┴────────────────┘ z=13
 *  x=0                x=7.5            x=15
 *
 * The staircase runs along the kitchen's east wall: bottom at (14.4, 8.0),
 * top at (14.4, 5.0), rising to LEVEL_Y. The stairwell hole in the upstairs
 * slab is x 13.8–15, z 4.69–7.9.
 */

export type RoomId =
  | 'storage'
  | 'bathroom'
  | 'kitchen'
  | 'momRoom'
  | 'hallway'
  | 'living'
  | 'playerRoom'
  | 'upHall'
  | 'upStudy'
  | 'upGuest'
  | 'upSewing'
  | 'upJunk'
  | 'upLaundry'
  | 'outside';

export type FloorType = 'carpet' | 'tile' | 'wood';
export type LightLevel = 'dark' | 'dim';
export type Level = 0 | 1;

/** Height of the upstairs floor surface. */
export const LEVEL_Y = 2.85;

// ── Stairs (kitchen, along east wall) ───────────────────────────────────────
export const STAIR_X0 = 13.8;
export const STAIR_X1 = 15;
export const STAIR_Z_TOP = 5.0; // y = LEVEL_Y here
export const STAIR_Z_BOTTOM = 8.0; // y = 0 here (1 m clear of the z=9 wall so you can step on)
/** stairwell hole in the upstairs slab */
export const STAIR_HOLE_Z0 = 4.69;
export const STAIR_HOLE_Z1 = 7.9;

/** Ramp height of the staircase at a given z (clamped 0..LEVEL_Y). */
export function stairHeightAt(z: number): number {
  const t = (STAIR_Z_BOTTOM - z) / (STAIR_Z_BOTTOM - STAIR_Z_TOP);
  return Math.max(0, Math.min(1, t)) * LEVEL_Y;
}

/** Is (x,z) inside the stair footprint (incl. small top/bottom margins)? */
export function inStairRegion(x: number, z: number): boolean {
  return x > STAIR_X0 - 0.02 && z > STAIR_HOLE_Z0 - 0.05 && z < STAIR_Z_BOTTOM + 0.3;
}

/** Which floor does a given height (feet y) belong to? */
export function levelOfY(y: number): Level {
  return y > LEVEL_Y / 2 ? 1 : 0;
}

export interface Room {
  id: RoomId;
  label: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floor: FloorType;
  light: LightLevel;
  level: Level;
}

export const ROOMS: Room[] = [
  // ground floor
  { id: 'storage', label: 'Storage Room', x0: 0, z0: 0, x1: 5, z1: 4, floor: 'wood', light: 'dark', level: 0 },
  { id: 'bathroom', label: 'Bathroom', x0: 5, z0: 0, x1: 10.5, z1: 4, floor: 'tile', light: 'dim', level: 0 },
  { id: 'kitchen', label: 'Kitchen', x0: 10.5, z0: 0, x1: 15, z1: 9, floor: 'tile', light: 'dim', level: 0 },
  { id: 'momRoom', label: "Mom's Bedroom", x0: 0, z0: 4, x1: 5, z1: 9, floor: 'carpet', light: 'dim', level: 0 },
  { id: 'hallway', label: 'Hallway', x0: 5, z0: 4, x1: 10.5, z1: 9, floor: 'wood', light: 'dim', level: 0 },
  { id: 'living', label: 'Living Room', x0: 0, z0: 9, x1: 9, z1: 13, floor: 'carpet', light: 'dim', level: 0 },
  { id: 'playerRoom', label: 'Your Bedroom', x0: 9, z0: 9, x1: 15, z1: 13, floor: 'carpet', light: 'dim', level: 0 },
  // upstairs
  { id: 'upStudy', label: 'Security Room', x0: 0, z0: 0, x1: 5, z1: 4.6, floor: 'carpet', light: 'dark', level: 1 },
  { id: 'upGuest', label: 'Guest Bedroom', x0: 5, z0: 0, x1: 10.5, z1: 4.6, floor: 'carpet', light: 'dim', level: 1 },
  { id: 'upSewing', label: 'Sewing Room', x0: 10.5, z0: 0, x1: 15, z1: 4.6, floor: 'wood', light: 'dark', level: 1 },
  { id: 'upHall', label: 'Upstairs Hallway', x0: 0, z0: 4.6, x1: 15, z1: 9, floor: 'wood', light: 'dim', level: 1 },
  { id: 'upJunk', label: 'Junk Room', x0: 0, z0: 9, x1: 7.5, z1: 13, floor: 'wood', light: 'dark', level: 1 },
  { id: 'upLaundry', label: 'Laundry Room', x0: 7.5, z0: 9, x1: 15, z1: 13, floor: 'tile', light: 'dim', level: 1 },
];

export function roomAt(x: number, z: number, level: Level = 0): RoomId {
  for (const r of ROOMS) {
    if (r.level === level && x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) return r.id;
  }
  return 'outside';
}

export function getRoom(id: RoomId): Room {
  const r = ROOMS.find((r) => r.id === id);
  if (!r) throw new Error(`unknown room ${id}`);
  return r;
}

// ── Doors ───────────────────────────────────────────────────────────────────

export type DoorKind = 'arch' | 'door';

export interface DoorDef {
  id: string;
  /** Wall axis the door sits in: 'x' = wall along Z at fixed X, 'z' = wall along X at fixed Z. */
  axis: 'x' | 'z';
  fixed: number;
  at: number;
  width: number;
  kind: DoorKind;
  level: Level;
  /** Panel doors only */
  startsOpen?: boolean;
  creaks?: boolean;
  lockable?: boolean;
  rooms: [RoomId, RoomId];
}

export const DOORS: DoorDef[] = [
  // ground floor
  { id: 'd_storage', axis: 'x', fixed: 5, at: 2, width: 1.1, kind: 'door', level: 0, startsOpen: false, lockable: true, rooms: ['storage', 'bathroom'] },
  { id: 'd_bath', axis: 'z', fixed: 4, at: 7.75, width: 1.0, kind: 'door', level: 0, startsOpen: false, lockable: true, rooms: ['bathroom', 'hallway'] },
  { id: 'd_mom', axis: 'x', fixed: 5, at: 6.5, width: 1.1, kind: 'door', level: 0, startsOpen: false, creaks: true, rooms: ['momRoom', 'hallway'] },
  { id: 'd_kitchen', axis: 'x', fixed: 10.5, at: 6.5, width: 1.3, kind: 'arch', level: 0, rooms: ['hallway', 'kitchen'] },
  { id: 'd_living', axis: 'z', fixed: 9, at: 7, width: 1.7, kind: 'arch', level: 0, rooms: ['hallway', 'living'] },
  { id: 'd_player', axis: 'z', fixed: 9, at: 9.85, width: 1.1, kind: 'door', level: 0, startsOpen: true, rooms: ['hallway', 'playerRoom'] },
  { id: 'd_lp', axis: 'x', fixed: 9, at: 11.2, width: 1.2, kind: 'arch', level: 0, rooms: ['living', 'playerRoom'] },
  // upstairs
  { id: 'd_up_study', axis: 'z', fixed: 4.6, at: 2.5, width: 1.1, kind: 'door', level: 1, startsOpen: false, rooms: ['upStudy', 'upHall'] },
  { id: 'd_up_guest', axis: 'z', fixed: 4.6, at: 7.75, width: 1.1, kind: 'door', level: 1, startsOpen: false, rooms: ['upGuest', 'upHall'] },
  { id: 'd_up_sewing', axis: 'z', fixed: 4.6, at: 12.3, width: 1.1, kind: 'door', level: 1, startsOpen: false, creaks: true, rooms: ['upSewing', 'upHall'] },
  { id: 'd_up_junk', axis: 'z', fixed: 9, at: 3.5, width: 1.5, kind: 'arch', level: 1, rooms: ['upHall', 'upJunk'] },
  { id: 'd_up_laundry', axis: 'z', fixed: 9, at: 11.0, width: 1.1, kind: 'door', level: 1, startsOpen: false, rooms: ['upHall', 'upLaundry'] },
];

// ── Walls ───────────────────────────────────────────────────────────────────

export interface WallDef {
  axis: 'x' | 'z'; // 'x' = runs along Z at fixed X; 'z' = runs along X at fixed Z
  fixed: number;
  from: number;
  to: number;
  level: Level;
  /** door ids cut into this wall */
  doors: string[];
}

export const WALLS: WallDef[] = [
  // ── ground floor ──
  // Exterior
  { axis: 'x', fixed: 0, from: 0, to: 13, level: 0, doors: [] },
  { axis: 'x', fixed: 15, from: 0, to: 13, level: 0, doors: [] },
  { axis: 'z', fixed: 0, from: 0, to: 15, level: 0, doors: [] },
  { axis: 'z', fixed: 13, from: 0, to: 15, level: 0, doors: [] },
  // Interior
  { axis: 'x', fixed: 5, from: 0, to: 4, level: 0, doors: ['d_storage'] },
  { axis: 'x', fixed: 10.5, from: 0, to: 9, level: 0, doors: ['d_kitchen'] },
  { axis: 'z', fixed: 4, from: 0, to: 5, level: 0, doors: [] },
  { axis: 'z', fixed: 4, from: 5, to: 10.5, level: 0, doors: ['d_bath'] },
  { axis: 'x', fixed: 5, from: 4, to: 9, level: 0, doors: ['d_mom'] },
  { axis: 'z', fixed: 9, from: 0, to: 5, level: 0, doors: [] },
  { axis: 'z', fixed: 9, from: 5, to: 10.5, level: 0, doors: ['d_living', 'd_player'] },
  { axis: 'z', fixed: 9, from: 10.5, to: 15, level: 0, doors: [] },
  { axis: 'x', fixed: 9, from: 9, to: 13, level: 0, doors: ['d_lp'] },
  // ── upstairs ──
  // Exterior
  { axis: 'x', fixed: 0, from: 0, to: 13, level: 1, doors: [] },
  { axis: 'x', fixed: 15, from: 0, to: 13, level: 1, doors: [] },
  { axis: 'z', fixed: 0, from: 0, to: 15, level: 1, doors: [] },
  { axis: 'z', fixed: 13, from: 0, to: 15, level: 1, doors: [] },
  // Interior: north rooms vs hallway
  { axis: 'z', fixed: 4.6, from: 0, to: 5, level: 1, doors: ['d_up_study'] },
  { axis: 'z', fixed: 4.6, from: 5, to: 10.5, level: 1, doors: ['d_up_guest'] },
  { axis: 'z', fixed: 4.6, from: 10.5, to: 15, level: 1, doors: ['d_up_sewing'] },
  { axis: 'x', fixed: 5, from: 0, to: 4.6, level: 1, doors: [] },
  { axis: 'x', fixed: 10.5, from: 0, to: 4.6, level: 1, doors: [] },
  // Interior: south rooms vs hallway
  { axis: 'z', fixed: 9, from: 0, to: 7.5, level: 1, doors: ['d_up_junk'] },
  { axis: 'z', fixed: 9, from: 7.5, to: 15, level: 1, doors: ['d_up_laundry'] },
  { axis: 'x', fixed: 7.5, from: 9, to: 13, level: 1, doors: [] },
];

/** 2D segment used for line-of-sight and wall-count tests. */
export interface Seg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

/** Static blocking segments per level (walls minus door holes). */
export function buildWallSegments(level: Level): Seg[] {
  const segs: Seg[] = [];
  for (const w of WALLS) {
    if (w.level !== level) continue;
    // collect holes sorted
    const holes = w.doors
      .map((id) => DOORS.find((d) => d.id === id))
      .filter((d): d is DoorDef => !!d)
      .map((d) => ({ a: d.at - d.width / 2, b: d.at + d.width / 2 }))
      .sort((a, b) => a.a - b.a);
    let cursor = w.from;
    for (const h of holes) {
      if (h.a > cursor) pushSeg(segs, w, cursor, h.a);
      cursor = h.b;
    }
    if (cursor < w.to) pushSeg(segs, w, cursor, w.to);
  }
  return segs;
}

function pushSeg(out: Seg[], w: WallDef, from: number, to: number) {
  if (w.axis === 'x') out.push({ ax: w.fixed, az: from, bx: w.fixed, bz: to });
  else out.push({ ax: from, az: w.fixed, bx: to, bz: w.fixed });
}

export function doorSegment(d: DoorDef): Seg {
  const a = d.at - d.width / 2;
  const b = d.at + d.width / 2;
  return d.axis === 'x'
    ? { ax: d.fixed, az: a, bx: d.fixed, bz: b }
    : { ax: a, az: d.fixed, bx: b, bz: d.fixed };
}

function segIntersect(p0x: number, p0z: number, p1x: number, p1z: number, s: Seg): boolean {
  const d1x = p1x - p0x;
  const d1z = p1z - p0z;
  const d2x = s.bx - s.ax;
  const d2z = s.bz - s.az;
  const denom = d1x * d2z - d1z * d2x;
  if (Math.abs(denom) < 1e-9) return false;
  const t = ((s.ax - p0x) * d2z - (s.az - p0z) * d2x) / denom;
  const u = ((s.ax - p0x) * d1z - (s.az - p0z) * d1x) / denom;
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

/** Number of blocking segments crossed between two points. 0 = clear line of sight. */
export function countBlockers(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  segs: Seg[],
): number {
  let n = 0;
  for (const s of segs) if (segIntersect(x0, z0, x1, z1, s)) n++;
  return n;
}

// ── Navigation graph ────────────────────────────────────────────────────────

export interface NavNode {
  id: string;
  x: number;
  z: number;
  /** feet height — 0 downstairs, LEVEL_Y upstairs, in-between on stairs */
  y: number;
  room: RoomId;
  /** door node ids carry the door id */
  door?: string;
}

export const NAV_NODES: NavNode[] = [
  // ── ground floor: room centers ──
  { id: 'storage', x: 2.5, z: 2, y: 0, room: 'storage' },
  { id: 'bathroom', x: 7.75, z: 2.2, y: 0, room: 'bathroom' },
  { id: 'kitchen', x: 12.6, z: 4.5, y: 0, room: 'kitchen' },
  { id: 'kitchen_n', x: 12.6, z: 1.8, y: 0, room: 'kitchen' },
  { id: 'kitchen_s', x: 12.6, z: 7.5, y: 0, room: 'kitchen' },
  { id: 'momRoom', x: 2.8, z: 6.5, y: 0, room: 'momRoom' },
  { id: 'momBed', x: 1.6, z: 6.9, y: 0, room: 'momRoom' },
  { id: 'hallway', x: 7.75, z: 6.5, y: 0, room: 'hallway' },
  { id: 'hall_w', x: 5.9, z: 6.5, y: 0, room: 'hallway' },
  { id: 'hall_e', x: 9.7, z: 6.5, y: 0, room: 'hallway' },
  { id: 'living', x: 4.5, z: 11, y: 0, room: 'living' },
  { id: 'living_w', x: 1.6, z: 11, y: 0, room: 'living' },
  { id: 'living_e', x: 7.2, z: 11.4, y: 0, room: 'living' },
  { id: 'playerRoom', x: 11.8, z: 11, y: 0, room: 'playerRoom' },
  { id: 'playerBed', x: 13.2, z: 10.4, y: 0, room: 'playerRoom' },
  // ground-floor doors
  { id: 'nd_storage', x: 5, z: 2, y: 0, room: 'bathroom', door: 'd_storage' },
  { id: 'nd_bath', x: 7.75, z: 4, y: 0, room: 'hallway', door: 'd_bath' },
  { id: 'nd_mom', x: 5, z: 6.5, y: 0, room: 'hallway', door: 'd_mom' },
  { id: 'nd_kitchen', x: 10.5, z: 6.5, y: 0, room: 'hallway', door: 'd_kitchen' },
  { id: 'nd_living', x: 7, z: 9, y: 0, room: 'hallway', door: 'd_living' },
  { id: 'nd_player', x: 9.85, z: 9, y: 0, room: 'hallway', door: 'd_player' },
  { id: 'nd_lp', x: 9, z: 11.2, y: 0, room: 'living', door: 'd_lp' },
  // ── staircase ──
  { id: 'stairs_foot', x: 14.3, z: 8.5, y: 0, room: 'kitchen' },
  { id: 'stairs_bottom', x: 14.4, z: 7.85, y: 0.14, room: 'kitchen' },
  { id: 'stairs_mid', x: 14.4, z: 6.5, y: 1.43, room: 'upHall' },
  { id: 'stairs_top', x: 14.4, z: 5.0, y: LEVEL_Y, room: 'upHall' },
  { id: 'stairs_exit', x: 14.0, z: 5.05, y: LEVEL_Y, room: 'upHall' },
  // ── upstairs: room centers ──
  { id: 'upHall', x: 7.75, z: 6.8, y: LEVEL_Y, room: 'upHall' },
  { id: 'up_hall_w', x: 2.5, z: 6.8, y: LEVEL_Y, room: 'upHall' },
  { id: 'up_hall_e', x: 12.6, z: 6.5, y: LEVEL_Y, room: 'upHall' },
  { id: 'upStudy', x: 2.5, z: 2.3, y: LEVEL_Y, room: 'upStudy' },
  { id: 'upGuest', x: 7.75, z: 2.3, y: LEVEL_Y, room: 'upGuest' },
  { id: 'upGuestBed', x: 6.2, z: 1.6, y: LEVEL_Y, room: 'upGuest' },
  { id: 'upSewing', x: 12.75, z: 2.3, y: LEVEL_Y, room: 'upSewing' },
  { id: 'upJunk', x: 3.5, z: 11, y: LEVEL_Y, room: 'upJunk' },
  { id: 'upJunk_w', x: 1.4, z: 11.5, y: LEVEL_Y, room: 'upJunk' },
  { id: 'upLaundry', x: 11.2, z: 11, y: LEVEL_Y, room: 'upLaundry' },
  // upstairs doors
  { id: 'nd_up_study', x: 2.5, z: 4.6, y: LEVEL_Y, room: 'upHall', door: 'd_up_study' },
  { id: 'nd_up_guest', x: 7.75, z: 4.6, y: LEVEL_Y, room: 'upHall', door: 'd_up_guest' },
  { id: 'nd_up_sewing', x: 12.3, z: 4.6, y: LEVEL_Y, room: 'upHall', door: 'd_up_sewing' },
  { id: 'nd_up_junk', x: 3.5, z: 9, y: LEVEL_Y, room: 'upHall', door: 'd_up_junk' },
  { id: 'nd_up_laundry', x: 11.0, z: 9, y: LEVEL_Y, room: 'upHall', door: 'd_up_laundry' },
];

export const NAV_EDGES: [string, string][] = [
  ['storage', 'nd_storage'],
  ['nd_storage', 'bathroom'],
  ['bathroom', 'nd_bath'],
  ['nd_bath', 'hallway'],
  ['momRoom', 'momBed'],
  ['momRoom', 'nd_mom'],
  ['nd_mom', 'hall_w'],
  ['hall_w', 'hallway'],
  ['hallway', 'hall_e'],
  ['hall_e', 'nd_kitchen'],
  ['nd_kitchen', 'kitchen'],
  ['kitchen', 'kitchen_n'],
  ['kitchen', 'kitchen_s'],
  ['hallway', 'nd_living'],
  ['nd_living', 'living'],
  ['living', 'living_w'],
  ['living', 'living_e'],
  ['hall_e', 'nd_player'],
  ['nd_player', 'playerRoom'],
  ['playerRoom', 'playerBed'],
  ['living_e', 'nd_lp'],
  ['nd_lp', 'playerRoom'],
  // staircase
  ['kitchen_s', 'stairs_foot'],
  ['stairs_foot', 'stairs_bottom'],
  ['stairs_bottom', 'stairs_mid'],
  ['stairs_mid', 'stairs_top'],
  ['stairs_top', 'stairs_exit'],
  ['stairs_exit', 'up_hall_e'],
  // upstairs
  ['up_hall_e', 'upHall'],
  ['upHall', 'up_hall_w'],
  ['upHall', 'nd_up_guest'],
  ['nd_up_guest', 'upGuest'],
  ['upGuest', 'upGuestBed'],
  ['up_hall_w', 'nd_up_study'],
  ['nd_up_study', 'upStudy'],
  ['up_hall_e', 'nd_up_sewing'],
  ['nd_up_sewing', 'upSewing'],
  ['up_hall_w', 'nd_up_junk'],
  ['nd_up_junk', 'upJunk'],
  ['upJunk', 'upJunk_w'],
  ['up_hall_e', 'nd_up_laundry'],
  ['nd_up_laundry', 'upLaundry'],
];

const adjacency = new Map<string, string[]>();
for (const [a, b] of NAV_EDGES) {
  if (!adjacency.has(a)) adjacency.set(a, []);
  if (!adjacency.has(b)) adjacency.set(b, []);
  adjacency.get(a)!.push(b);
  adjacency.get(b)!.push(a);
}

export function navNode(id: string): NavNode {
  const n = NAV_NODES.find((n) => n.id === id);
  if (!n) throw new Error(`unknown nav node ${id}`);
  return n;
}

/**
 * Nearest node to a 3D position. `y` is feet height (0 or LEVEL_Y, or
 * in-between on the stairs); nodes on a very different height are skipped
 * so a point upstairs never snaps to the room below it.
 */
export function nearestNode(x: number, z: number, y = 0, room?: RoomId): NavNode {
  let best: NavNode | null = null;
  let bestD = Infinity;
  for (const n of NAV_NODES) {
    if (Math.abs(n.y - y) > 1.45) continue;
    if (room && n.room !== room && !n.door) continue;
    const d = (n.x - x) ** 2 + (n.z - z) ** 2 + (n.y - y) ** 2 * 4;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  if (best) return best;
  // fallback: ignore the room filter, then the height filter
  for (const n of NAV_NODES) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2 + (n.y - y) ** 2 * 4;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best ?? NAV_NODES[0];
}

/** Dijkstra path between node ids. Returns list of nodes (inclusive). */
export function findPath(fromId: string, toId: string): NavNode[] {
  if (fromId === toId) return [navNode(fromId)];
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  dist.set(fromId, 0);
  while (true) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < curD) {
        cur = id;
        curD = d;
      }
    }
    if (cur === null) break;
    if (cur === toId) break;
    visited.add(cur);
    const a = navNode(cur);
    for (const nb of adjacency.get(cur) ?? []) {
      if (visited.has(nb)) continue;
      const b = navNode(nb);
      const nd = curD + Math.hypot(b.x - a.x, b.z - a.z, (b.y - a.y) * 0.6);
      if (nd < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, nd);
        prev.set(nb, cur);
      }
    }
  }
  if (!prev.has(toId) && fromId !== toId) return [navNode(fromId)];
  const out: NavNode[] = [];
  let c: string | undefined = toId;
  while (c) {
    out.unshift(navNode(c));
    if (c === fromId) break;
    c = prev.get(c);
  }
  return out;
}

/** Rough room-distance (number of rooms between) using nav graph hops on room nodes. */
export function roomDistance(a: RoomId, b: RoomId): number {
  if (a === b) return 0;
  if (a === 'outside' || b === 'outside') return 99;
  const path = findPath(a, b);
  let rooms = new Set(path.map((n) => n.room)).size - 1;
  if (rooms < 1) rooms = 1;
  return rooms;
}
