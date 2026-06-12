/**
 * runtime.ts — mutable per-frame shared state (NOT React state).
 * Player/Mom systems write here every frame; other frame systems read it.
 * UI-relevant snapshots are pushed to the zustand store at low frequency.
 */

import type { Level, RoomId } from './house';
import { buildWallSegments, type Seg } from './house';

export type MomStateId =
  | 'sleep'
  | 'fakeSleep'
  | 'patrol'
  | 'investigate'
  | 'search'
  | 'chase'
  | 'return'
  | 'tranq'
  | 'finale';

export interface NoiseEvent {
  x: number;
  z: number;
  /** which floor the noise happened on */
  level: Level;
  intensity: number;
  kind: string;
  time: number;
}

type NoiseListener = (e: NoiseEvent) => void;

const noiseListeners = new Set<NoiseListener>();

export function onNoise(fn: NoiseListener): () => void {
  noiseListeners.add(fn);
  return () => noiseListeners.delete(fn);
}

/** Emit a noise. `level` defaults to the player's current floor. */
export function emitNoise(
  x: number,
  z: number,
  intensity: number,
  kind = 'generic',
  level: Level = runtime.playerLevel,
) {
  const e: NoiseEvent = { x, z, level, intensity, kind, time: performance.now() / 1000 };
  for (const fn of noiseListeners) fn(e);
}

export const runtime = {
  // player
  playerX: 12.5,
  playerZ: 11.8,
  /** feet height (0 downstairs … LEVEL_Y upstairs) */
  playerY: 0,
  playerLevel: 0 as Level,
  playerVelX: 0,
  playerVelZ: 0,
  playerRoom: 'playerRoom' as RoomId,
  playerCrouching: false,
  playerSprinting: false,
  playerMoving: false,
  playerHidden: false,
  hideSpotId: null as string | null,
  flashlightOn: false,
  holdingBreath: false,
  exhaustedBreathUntil: 0, // perf.now()/1000 timestamp
  stumbleUntil: 0,

  // mom
  momX: 1.2,
  momZ: 5.5,
  /** feet height (0 downstairs … LEVEL_Y upstairs) */
  momY: 0,
  momLevel: 0 as Level,
  momRoom: 'momRoom' as RoomId,
  momState: 'sleep' as MomStateId,
  momYaw: 0,
  momDetection: 0,
  momTargetDesc: '' as string, // debug
  stress: 0,

  // doors: open fraction 0..1 and locked flags
  doorOpen: {} as Record<string, number>,
  doorLocked: {} as Record<string, boolean>,

  /** searched spots left open (evidence for Mom) */
  openedSpots: new Set<string>(),

  /** container open animation 0..1 per spot id */
  spotAnim: {} as Record<string, number>,
  /** direction the container opens toward (unit x,z — toward the player) */
  spotOpenDir: {} as Record<string, [number, number]>,

  /** static wall segments for LOS, per level */
  wallSegs: [[], []] as [Seg[], Seg[]],

  /** seconds since scene start */
  clock: 0,

  reset() {
    this.playerX = 12.5;
    this.playerZ = 11.8;
    this.playerY = 0;
    this.playerLevel = 0;
    this.playerVelX = 0;
    this.playerVelZ = 0;
    this.playerRoom = 'playerRoom';
    this.playerCrouching = false;
    this.playerSprinting = false;
    this.playerMoving = false;
    this.playerHidden = false;
    this.hideSpotId = null;
    this.flashlightOn = false;
    this.holdingBreath = false;
    this.exhaustedBreathUntil = 0;
    this.stumbleUntil = 0;
    this.momX = 1.2;
    this.momZ = 5.5;
    this.momY = 0;
    this.momLevel = 0;
    this.momRoom = 'momRoom';
    this.momState = 'sleep';
    this.momYaw = 0;
    this.momDetection = 0;
    this.stress = 0;
    this.doorOpen = {};
    this.doorLocked = {};
    this.openedSpots = new Set();
    this.spotAnim = {};
    this.spotOpenDir = {};
    this.clock = 0;
    this.wallSegs = [buildWallSegments(0), buildWallSegments(1)];
  },
};

runtime.reset();

/** Blocking segments incl. closed door panels (cheap, built per query). */
import { DOORS, doorSegment, countBlockers, type Level as L } from './house';

function blockersOnLevel(x0: number, z0: number, x1: number, z1: number, level: L): number {
  let n = countBlockers(x0, z0, x1, z1, runtime.wallSegs[level]);
  for (const d of DOORS) {
    if (d.kind !== 'door' || d.level !== level) continue;
    const open = runtime.doorOpen[d.id] ?? (d.startsOpen ? 1 : 0);
    if (open < 0.5) {
      n += countBlockers(x0, z0, x1, z1, [doorSegment(d)]);
    }
  }
  return n;
}

/**
 * Walls crossed between two points. If the points are on different floors the
 * slab counts as two extra "walls" and both floors' walls are considered.
 */
export function blockersBetween(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  l0: L = 0,
  l1: L = l0,
): number {
  if (l0 === l1) return blockersOnLevel(x0, z0, x1, z1, l0);
  return (
    2 +
    Math.max(
      blockersOnLevel(x0, z0, x1, z1, 0),
      blockersOnLevel(x0, z0, x1, z1, 1),
    )
  );
}

export function hasLineOfSight(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  level: L = 0,
): boolean {
  return blockersOnLevel(x0, z0, x1, z1, level) === 0;
}
