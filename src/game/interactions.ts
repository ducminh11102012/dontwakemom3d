/**
 * interactions.ts — what can the player do right now? (GDD §8)
 * Pure helpers used by PlayerController each frame.
 */

import { DOORS, type DoorDef } from './house';
import { runtime } from './runtime';
import { HIDE_SPOTS, SEARCH_SPOTS, getSpot, type HideSpot, type SearchSpot } from './spots';
import { useGameStore } from '../state/gameStore';

export const FLASHLIGHT_POS: [number, number, number] = [10.6, 0.82, 9.62];

export type Interactable =
  | { type: 'search'; spot: SearchSpot; label: string }
  | { type: 'return'; spot: SearchSpot; label: string }
  | { type: 'hide'; spot: HideSpot; label: string }
  | { type: 'door'; door: DoorDef; label: string; lockHint: boolean }
  | { type: 'flashlight'; label: string };

const REACH = 1.7;

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

  // flashlight pickup
  if (!store.hasFlashlight) {
    const d = dist2(FLASHLIGHT_POS[0], FLASHLIGHT_POS[2]);
    if (d < bestD && facing(FLASHLIGHT_POS[0], FLASHLIGHT_POS[2], yaw)) {
      best = { type: 'flashlight', label: 'Take the flashlight' };
      bestD = d;
    }
  }

  // search spots / phone return
  for (const s of SEARCH_SPOTS) {
    const d = dist2(s.x, s.z);
    if (d >= bestD || !facing(s.x, s.z, yaw)) continue;
    if (store.hasPhone && s.id === store.phoneSpotId) {
      best = { type: 'return', spot: s, label: `Put the phone back (${s.label})` };
      bestD = d;
    } else if (!store.hasPhone && !runtime.openedSpots.has(s.id) && !store.phoneReturned) {
      best = { type: 'search', spot: s, label: `Search ${s.label}` };
      bestD = d;
    }
  }

  // hide spots
  for (const h of HIDE_SPOTS) {
    const d = dist2(h.x, h.z);
    if (d >= bestD || !facing(h.x, h.z, yaw)) continue;
    best = { type: 'hide', spot: h, label: h.label };
    bestD = d;
  }

  // panel doors
  for (const door of DOORS) {
    if (door.kind !== 'door') continue;
    const cx = door.axis === 'x' ? door.fixed : door.at;
    const cz = door.axis === 'x' ? door.at : door.fixed;
    const d = dist2(cx, cz);
    if (d >= Math.min(bestD, 1.4 * 1.4) || !facing(cx, cz, yaw)) continue;
    const open = runtime.doorOpen[door.id] ?? (door.startsOpen ? 1 : 0);
    const locked = runtime.doorLocked[door.id] ?? false;
    const insideBathroom = runtime.playerRoom === 'bathroom' && door.id === 'd_bath';
    let label: string;
    if (locked) label = 'Unlock the door';
    else label = open > 0.5 ? 'Close the door' : 'Open the door';
    if (door.creaks && open <= 0.5 && !locked) label += ' (it will creak)';
    best = { type: 'door', door, label, lockHint: insideBathroom && open <= 0.5 };
    bestD = d;
  }

  return best;
}

/** the original spot label, for the Act-3 objective */
export function phoneSpotLabel(): string {
  return getSpot(useGameStore.getState().phoneSpotId).label;
}
