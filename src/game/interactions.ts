/**
 * interactions.ts — what can the player do right now? (GDD §8)
 * Pure helpers used by PlayerController each frame.
 */

import { DOORS, type DoorDef } from './house';
import { runtime } from './runtime';
import { HIDE_SPOTS, SEARCH_SPOTS, getSpot, type HideSpot, type SearchSpot } from './spots';
import { useGameStore } from '../state/gameStore';
import { SAFE_POS } from '../constants';

export const FLASHLIGHT_POS: [number, number, number] = [12.4, 0.82, 12.3];

export type Interactable =
  | { type: 'search'; spot: SearchSpot; label: string }
  | { type: 'take'; spot: SearchSpot; item: SpotItem; label: string }
  | { type: 'return'; spot: SearchSpot; label: string }
  | { type: 'hide'; spot: HideSpot; label: string }
  | { type: 'door'; door: DoorDef; label: string; lockHint: boolean; needsKey: boolean }
  | { type: 'safe'; label: string }
  | { type: 'flashlight'; label: string };

const REACH = 1.7;

// ── container contents ──────────────────────────────────────────────────────

export type SpotItem = 'phone' | 'key' | 'note' | 'dart';

type StoreState = ReturnType<typeof useGameStore.getState>;

/** what is (still) inside an opened container? */
export function spotItem(spotId: string, store: StoreState): SpotItem | null {
  if (spotId === store.phoneSpotId && !store.hasPhone && !store.phoneReturned) return 'phone';
  if (spotId === store.keySpotId && !store.hasStorageKey) return 'key';
  if (spotId === store.noteSpotId && !store.knowsCode) return 'note';
  if (spotId === store.dartSpotId && !store.dartTaken) return 'dart';
  return null;
}

const TAKE_LABEL: Record<SpotItem, string> = {
  phone: 'Take the phone',
  key: 'Take the brass key',
  note: 'Read the note',
  dart: 'Take the tranquilizer dart',
};

/** verb for opening a container, per class */
function openVerb(spot: SearchSpot): string {
  switch (spot.cls) {
    case 'pillow':
      return `Lift ${spot.label}`;
    case 'rice':
    case 'box':
      return `Open ${spot.label}`;
    case 'smallDrawer':
    case 'largeDrawer':
      return `Pull open ${spot.label}`;
    default:
      return `Open ${spot.label}`;
  }
}

function dist2(x: number, z: number): number {
  const dx = x - runtime.playerX;
  const dz = z - runtime.playerZ;
  return dx * dx + dz * dz;
}

/** is the point roughly in front of the camera? */
function facing(x: number, z: number, yaw: number): boolean {
  const dx = x - runtime.playerX;
  const dz = z - runtime.playerZ;
  const len = Math.hypot(dx, dz);
  if (len < 0.45) return true;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  return (dx / len) * fx + (dz / len) * fz > 0.35;
}

export function findInteractable(yaw: number): Interactable | null {
  const store = useGameStore.getState();
  if (runtime.playerHidden) return null;

  let best: Interactable | null = null;
  let bestD = REACH * REACH;
  const lvl = runtime.playerLevel;

  // flashlight pickup (downstairs)
  if (!store.hasFlashlight && lvl === 0) {
    const d = dist2(FLASHLIGHT_POS[0], FLASHLIGHT_POS[2]);
    if (d < bestD && facing(FLASHLIGHT_POS[0], FLASHLIGHT_POS[2], yaw)) {
      best = { type: 'flashlight', label: 'Take the flashlight' };
      bestD = d;
    }
  }

  // the safe in the storage room (holds the tranquilizer gun)
  if (!store.safeOpen && lvl === 0) {
    const d = dist2(SAFE_POS[0], SAFE_POS[2]);
    if (d < bestD && facing(SAFE_POS[0], SAFE_POS[2], yaw)) {
      best = {
        type: 'safe',
        label: store.knowsCode
          ? 'Open the safe (you know the code)'
          : 'A code-locked safe… 4 digits',
      };
      bestD = d;
    }
  }

  // search spots / phone return
  for (const s of SEARCH_SPOTS) {
    if ((s.level ?? 0) !== lvl) continue;
    const d = dist2(s.x, s.z);
    if (d >= bestD || !facing(s.x, s.z, yaw)) continue;
    if (store.hasPhone && s.id === store.phoneSpotId) {
      best = { type: 'return', spot: s, label: `Put the phone back (${s.label})` };
      bestD = d;
    } else if (runtime.openedSpots.has(s.id)) {
      const item = spotItem(s.id, store);
      if (item) {
        best = { type: 'take', spot: s, item, label: TAKE_LABEL[item] };
        bestD = d;
      }
    } else if (!store.hasPhone && !store.phoneReturned) {
      best = { type: 'search', spot: s, label: openVerb(s) };
      bestD = d;
    }
  }

  // hide spots
  for (const h of HIDE_SPOTS) {
    if ((h.level ?? 0) !== lvl) continue;
    const d = dist2(h.x, h.z);
    if (d >= bestD || !facing(h.x, h.z, yaw)) continue;
    best = { type: 'hide', spot: h, label: h.label };
    bestD = d;
  }

  // panel doors
  for (const door of DOORS) {
    if (door.kind !== 'door' || door.level !== lvl) continue;
    const cx = door.axis === 'x' ? door.fixed : door.at;
    const cz = door.axis === 'x' ? door.at : door.fixed;
    const d = dist2(cx, cz);
    if (d >= Math.min(bestD, 1.4 * 1.4) || !facing(cx, cz, yaw)) continue;
    const open = runtime.doorOpen[door.id] ?? (door.startsOpen ? 1 : 0);
    const locked = runtime.doorLocked[door.id] ?? false;
    const insideBathroom = runtime.playerRoom === 'bathroom' && door.id === 'd_bath';
    const needsKey = locked && door.id === 'd_storage' && !store.hasStorageKey;
    let label: string;
    if (needsKey) label = 'Locked. It needs a key…';
    else if (locked)
      label = door.id === 'd_storage' ? 'Unlock with the brass key' : 'Unlock the door';
    else label = open > 0.5 ? 'Close the door' : 'Open the door';
    if (door.creaks && open <= 0.5 && !locked) label += ' (it will creak)';
    best = { type: 'door', door, label, lockHint: insideBathroom && open <= 0.5, needsKey };
    bestD = d;
  }

  return best;
}

/** the original spot label, for the Act-3 objective */
export function phoneSpotLabel(): string {
  return getSpot(useGameStore.getState().phoneSpotId).label;
}
