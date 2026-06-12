/**
 * runtime.ts — mutable per-frame shared state (NOT React state).
 * Player/Mom systems write here every frame; other frame systems read it.
 * UI-relevant snapshots are pushed to the zustand store at low frequency.
 */

import type { RoomId } from './house';
import { buildWallSegments, type Seg } from './house';

export type MomStateId =
  | 'sleep'
  | 'fakeSleep'
  | 'patrol'
  | 'investigate'
  | 'search'
  | 'chase'
  | 'return'
  | 'finale';

export interface NoiseEvent {
  x: number;
  z: number;
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

export function emitNoise(x: number, z: number, intensity: number, kind = 'generic') {
  const e: NoiseEvent = { x, z, intensity, kind, time: performance.now() / 1000 };
  for (const fn of noiseListeners) fn(e);
}

export const runtime = {
  // player
  playerX: 12.5,
  playerZ: 11.8,
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

  /** static wall segments for LOS */
  wallSegs: [] as Seg[],

  /** seconds since scene start */
  clock: 0,

  reset() {
    this.playerX = 12.5;
    this.playerZ = 11.8;
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
    this.momRoom = 'momRoom';
    this.momState = 'sleep';
    this.momYaw = 0;
    this.momDetection = 0;
    this.stress = 0;
    this.doorOpen = {};
    this.doorLocked = {};
    this.openedSpots = new Set();
    this.clock = 0;
    this.wallSegs = buildWallSegments();
  },
};

runtime.reset();

/** Blocking segments incl. closed door panels (cheap, built per query). */
import { DOORS, doorSegment, countBlockers } from './house';

export function blockersBetween(x0: number, z0: number, x1: number, z1: number): number {
  let n = countBlockers(x0, z0, x1, z1, runtime.wallSegs);
  for (const d of DOORS) {
    if (d.kind !== 'door') continue;
    const open = runtime.doorOpen[d.id] ?? (d.startsOpen ? 1 : 0);
    if (open < 0.5) {
      n += countBlockers(x0, z0, x1, z1, [doorSegment(d)]);
    }
  }
  return n;
}

export function hasLineOfSight(x0: number, z0: number, x1: number, z1: number): boolean {
  return blockersBetween(x0, z0, x1, z1) === 0;
}
