/**
 * spots.ts — searchable objects (GDD §7/§8) and hiding spots (GDD §11).
 * Positions are world coordinates; prompts trigger within `reach` of promptPos.
 */

import type { RoomId } from './house';

// ── Search spots ────────────────────────────────────────────────────────────

export type SearchClass =
  | 'pillow'
  | 'smallDrawer'
  | 'largeDrawer'
  | 'fridge'
  | 'wardrobe'
  | 'rice'
  | 'box'
  | 'cabinet';

/** Base (Normal) search duration seconds + noise intensity per GDD §8. */
export const SEARCH_CLASS_DATA: Record<SearchClass, { time: number; noise: number }> = {
  pillow: { time: 1.5, noise: 0.08 },
  smallDrawer: { time: 1.5, noise: 0.3 },
  largeDrawer: { time: 2.0, noise: 0.38 },
  fridge: { time: 2.0, noise: 0.22 }, // hum covers
  wardrobe: { time: 2.5, noise: 0.5 },
  rice: { time: 2.0, noise: 0.4 },
  box: { time: 3.0, noise: 0.42 },
  cabinet: { time: 1.8, noise: 0.32 },
};

export type PhoneTier = 1 | 2 | 3 | 0; // 0 = fake target, never has the phone

export interface SearchSpot {
  id: string;
  label: string;
  room: RoomId;
  x: number;
  y: number; // prompt height
  z: number;
  cls: SearchClass;
  tier: PhoneTier;
  /** which floor (default 0) */
  level?: 0 | 1;
}

export const SEARCH_SPOTS: SearchSpot[] = [
  // ── Mom's bedroom (danger zone) ──
  { id: 'mom_pillow', label: "Mom's pillow", room: 'momRoom', x: 1.2, y: 0.65, z: 5.0, cls: 'pillow', tier: 1 },
  { id: 'mom_nightstand', label: 'Nightstand drawer', room: 'momRoom', x: 2.75, y: 0.6, z: 4.75, cls: 'smallDrawer', tier: 1 },
  { id: 'mom_wardrobe', label: "Mom's wardrobe", room: 'momRoom', x: 4.2, y: 1.1, z: 4.7, cls: 'wardrobe', tier: 2 },
  { id: 'mom_dresser1', label: 'Dresser drawer', room: 'momRoom', x: 0.9, y: 0.7, z: 8.5, cls: 'largeDrawer', tier: 0 },
  { id: 'mom_dresser2', label: 'Dresser drawer', room: 'momRoom', x: 1.7, y: 0.5, z: 8.5, cls: 'largeDrawer', tier: 0 },
  // ── Kitchen ──
  { id: 'kitchen_fridge', label: 'Fridge', room: 'kitchen', x: 14.6, y: 1.2, z: 1.4, cls: 'fridge', tier: 2 },
  { id: 'kitchen_rice', label: 'Rice container', room: 'kitchen', x: 11.4, y: 1.0, z: 0.6, cls: 'rice', tier: 3 },
  { id: 'kitchen_drawer1', label: 'Kitchen drawer', room: 'kitchen', x: 12.3, y: 0.8, z: 0.6, cls: 'smallDrawer', tier: 0 },
  { id: 'kitchen_drawer2', label: 'Kitchen drawer', room: 'kitchen', x: 13.1, y: 0.8, z: 0.6, cls: 'smallDrawer', tier: 0 },
  { id: 'kitchen_cab1', label: 'Lower cabinet', room: 'kitchen', x: 12.7, y: 0.4, z: 0.6, cls: 'cabinet', tier: 0 },
  { id: 'kitchen_cab2', label: 'Upper cabinet', room: 'kitchen', x: 11.9, y: 1.7, z: 0.6, cls: 'cabinet', tier: 0 },
  // ── Living room ──
  { id: 'living_tv', label: 'TV cabinet', room: 'living', x: 4.0, y: 0.45, z: 9.6, cls: 'cabinet', tier: 2 },
  { id: 'living_shelf', label: 'Bookshelf', room: 'living', x: 0.6, y: 1.2, z: 10.8, cls: 'cabinet', tier: 3 },
  { id: 'living_coffee', label: 'Coffee table drawer', room: 'living', x: 4.0, y: 0.4, z: 10.9, cls: 'smallDrawer', tier: 0 },
  { id: 'living_cushions', label: 'Sofa cushions', room: 'living', x: 4.0, y: 0.55, z: 11.9, cls: 'pillow', tier: 0 },
  { id: 'living_cabinet', label: 'Side cabinet', room: 'living', x: 7.9, y: 0.6, z: 12.5, cls: 'cabinet', tier: 0 },
  // ── Bathroom ──
  { id: 'bath_cabinet', label: 'Bathroom cabinet', room: 'bathroom', x: 6.2, y: 0.6, z: 0.7, cls: 'cabinet', tier: 3 },
  { id: 'bath_mirror', label: 'Mirror cabinet', room: 'bathroom', x: 6.2, y: 1.6, z: 0.45, cls: 'smallDrawer', tier: 0 },
  { id: 'bath_basket', label: 'Laundry basket', room: 'bathroom', x: 9.9, y: 0.5, z: 0.8, cls: 'box', tier: 0 },
  // ── Storage room ──
  { id: 'storage_box', label: 'Storage box', room: 'storage', x: 1.0, y: 0.5, z: 0.8, cls: 'box', tier: 3 },
  { id: 'storage_basket1', label: 'Wicker basket', room: 'storage', x: 2.2, y: 0.4, z: 0.7, cls: 'box', tier: 0 },
  { id: 'storage_basket2', label: 'Old crate', room: 'storage', x: 4.3, y: 0.5, z: 3.3, cls: 'box', tier: 0 },
  { id: 'storage_shelf', label: 'Shelf boxes', room: 'storage', x: 0.5, y: 1.3, z: 2.4, cls: 'cabinet', tier: 0 },
  // ── Player bedroom (fakes only — you'd remember) ──
  { id: 'player_desk', label: 'Desk drawer', room: 'playerRoom', x: 12.85, y: 0.7, z: 12.05, cls: 'smallDrawer', tier: 0 },

  // ════ UPSTAIRS (level 1, floor at y=2.85) ════
  // ── Guest bedroom ──
  { id: 'guest_nightstand', label: 'Guest nightstand', room: 'upGuest', x: 7.9, y: 3.45, z: 0.75, cls: 'smallDrawer', tier: 2, level: 1 },
  { id: 'guest_wardrobe', label: 'Guest wardrobe', room: 'upGuest', x: 9.7, y: 3.95, z: 1.0, cls: 'wardrobe', tier: 2, level: 1 },
  { id: 'guest_pillow', label: 'Guest pillow', room: 'upGuest', x: 6.4, y: 3.51, z: 0.75, cls: 'pillow', tier: 0, level: 1 },
  // ── Study ──
  { id: 'study_desk', label: 'Study desk drawer', room: 'upStudy', x: 2.4, y: 3.55, z: 0.8, cls: 'smallDrawer', tier: 3, level: 1 },
  { id: 'study_shelf', label: 'Study bookshelf', room: 'upStudy', x: 0.6, y: 4.05, z: 2.2, cls: 'cabinet', tier: 3, level: 1 },
  { id: 'study_cabinet', label: 'File cabinet', room: 'upStudy', x: 4.3, y: 3.45, z: 0.65, cls: 'cabinet', tier: 0, level: 1 },
  // ── Sewing room ──
  { id: 'sewing_drawer', label: 'Sewing table drawer', room: 'upSewing', x: 12.5, y: 3.55, z: 1.35, cls: 'smallDrawer', tier: 0, level: 1 },
  { id: 'sewing_basket', label: 'Sewing basket', room: 'upSewing', x: 14.3, y: 3.25, z: 0.8, cls: 'box', tier: 3, level: 1 },
  { id: 'sewing_cabinet', label: 'Fabric cabinet', room: 'upSewing', x: 14.4, y: 3.85, z: 3.4, cls: 'cabinet', tier: 2, level: 1 },
  // ── Junk room ──
  { id: 'junk_box1', label: 'Dusty box', room: 'upJunk', x: 1.0, y: 3.35, z: 12.3, cls: 'box', tier: 3, level: 1 },
  { id: 'junk_box2', label: 'Old box', room: 'upJunk', x: 2.4, y: 3.35, z: 12.4, cls: 'box', tier: 0, level: 1 },
  { id: 'junk_crate', label: 'Wooden crate', room: 'upJunk', x: 6.8, y: 3.35, z: 12.5, cls: 'box', tier: 0, level: 1 },
  // ── Laundry room ──
  { id: 'laundry_machine', label: 'Washing machine', room: 'upLaundry', x: 8.2, y: 3.4, z: 12.2, cls: 'cabinet', tier: 2, level: 1 },
  { id: 'laundry_shelf', label: 'Laundry shelf', room: 'upLaundry', x: 14.4, y: 3.85, z: 11.5, cls: 'cabinet', tier: 0, level: 1 },
  { id: 'laundry_pile', label: 'Pile of clothes', room: 'upLaundry', x: 12.5, y: 3.15, z: 12.3, cls: 'pillow', tier: 0, level: 1 },
];

/** GDD §7 spawn tiers: 20% T1, 40% T2, 40% T3 — then uniform inside the tier. */
export function rollPhoneSpot(rng: () => number = Math.random): string {
  const r = rng();
  const tier: PhoneTier = r < 0.2 ? 1 : r < 0.6 ? 2 : 3;
  const candidates = SEARCH_SPOTS.filter((s) => s.tier === tier);
  return candidates[Math.floor(rng() * candidates.length)].id;
}

/**
 * Granny-style item placement: storage key, safe-code note and a spare dart
 * hide in random search spots each run. Key + note never spawn inside the
 * locked storage room (or you could never reach them) and never share a spot
 * with the phone or each other.
 */
export function rollItemSpots(
  phoneSpotId: string,
  rng: () => number = Math.random,
): { keySpotId: string; noteSpotId: string; dartSpotId: string } {
  const taken = new Set<string>([phoneSpotId]);
  const pick = (candidates: SearchSpot[]): string => {
    const free = candidates.filter((s) => !taken.has(s.id));
    const id = free[Math.floor(rng() * free.length)].id;
    taken.add(id);
    return id;
  };
  const outsideStorage = SEARCH_SPOTS.filter((s) => s.room !== 'storage');
  const keySpotId = pick(outsideStorage);
  const noteSpotId = pick(outsideStorage);
  const dartSpotId = pick(SEARCH_SPOTS);
  return { keySpotId, noteSpotId, dartSpotId };
}

export function getSpot(id: string): SearchSpot {
  const s = SEARCH_SPOTS.find((s) => s.id === id);
  if (!s) throw new Error(`unknown search spot ${id}`);
  return s;
}

// ── Hiding spots ────────────────────────────────────────────────────────────

export interface HideSpot {
  id: string;
  label: string;
  room: RoomId;
  /** where the prompt appears / player stands to enter */
  x: number;
  y: number;
  z: number;
  /** camera position while hidden */
  cam: [number, number, number];
  /** yaw while hidden */
  camYaw: number;
  /** where the player pops back out */
  exit: [number, number];
  /** 0 = mom checks first … 1 = mom checks last (GDD §11 safety) */
  safety: number;
  /** point mom walks to when checking this spot */
  check: [number, number];
  /** counts as "in bed" for endings */
  isBed?: boolean;
  /** which floor (default 0) */
  level?: 0 | 1;
}

export const HIDE_SPOTS: HideSpot[] = [
  { id: 'h_player_bed_in', label: 'Get in bed', room: 'playerRoom', x: 13.4, y: 0.6, z: 10.6, cam: [13.8, 0.55, 10.4], camYaw: Math.PI / 2, exit: [13.0, 11.0], safety: 0.95, check: [13.0, 10.6], isBed: true },
  { id: 'h_player_bed_under', label: 'Hide under your bed', room: 'playerRoom', x: 13.4, y: 0.25, z: 11.0, cam: [13.9, 0.28, 10.3], camYaw: Math.PI / 2, exit: [13.0, 11.2], safety: 0.9, check: [13.0, 10.8] },
  { id: 'h_player_wardrobe', label: 'Hide in the wardrobe', room: 'playerRoom', x: 10.0, y: 1.0, z: 12.4, cam: [10.0, 1.45, 12.6], camYaw: 0, exit: [10.0, 11.9], safety: 0.7, check: [10.0, 11.8] },
  { id: 'h_sofa', label: 'Hide behind the sofa', room: 'living', x: 4.0, y: 0.4, z: 12.55, cam: [4.0, 0.5, 12.6], camYaw: 0, exit: [5.8, 12.2], safety: 0.5, check: [5.9, 12.4] },
  { id: 'h_curtains', label: 'Hide behind the curtains', room: 'living', x: 0.5, y: 1.0, z: 11.0, cam: [0.35, 1.45, 11.0], camYaw: -Math.PI / 2, exit: [1.2, 11.0], safety: 0.35, check: [1.2, 11.0] },
  { id: 'h_storage_box', label: 'Hide inside the big box', room: 'storage', x: 3.6, y: 0.5, z: 0.9, cam: [3.6, 0.7, 0.9], camYaw: Math.PI, exit: [3.6, 1.9], safety: 0.75, check: [3.4, 1.8] },
  { id: 'h_shower', label: 'Hide behind the shower curtain', room: 'bathroom', x: 9.6, y: 1.0, z: 3.2, cam: [9.8, 1.45, 3.3], camYaw: Math.PI / 4, exit: [8.9, 2.8], safety: 0.7, check: [8.9, 2.9] },
  { id: 'h_mom_bed_under', label: "Hide under Mom's bed", room: 'momRoom', x: 1.6, y: 0.25, z: 6.4, cam: [1.2, 0.28, 5.8], camYaw: Math.PI, exit: [2.0, 6.9], safety: 0.85, check: [2.2, 6.0] },
  // ── upstairs ──
  { id: 'h_guest_bed_under', label: 'Hide under the guest bed', room: 'upGuest', x: 6.4, y: 3.1, z: 2.7, cam: [6.4, 3.13, 1.8], camYaw: 0, exit: [6.4, 3.2], safety: 0.8, check: [6.6, 2.9], level: 1 },
  { id: 'h_guest_wardrobe', label: 'Hide in the guest wardrobe', room: 'upGuest', x: 9.7, y: 3.85, z: 1.0, cam: [10.05, 4.3, 1.0], camYaw: Math.PI / 2, exit: [9.3, 1.0], safety: 0.65, check: [9.4, 1.1], level: 1 },
  { id: 'h_junk_sheet', label: 'Hide under the dust sheet', room: 'upJunk', x: 1.0, y: 3.35, z: 10.3, cam: [0.85, 3.45, 10.3], camYaw: -Math.PI / 2, exit: [1.8, 10.5], safety: 0.6, check: [1.7, 10.4], level: 1 },
  { id: 'h_laundry_pile', label: 'Burrow into the clothes pile', room: 'upLaundry', x: 12.5, y: 3.25, z: 12.3, cam: [12.5, 3.35, 12.5], camYaw: 0, exit: [12.5, 11.6], safety: 0.7, check: [12.4, 11.7], level: 1 },
];

export function getHideSpot(id: string): HideSpot {
  const s = HIDE_SPOTS.find((s) => s.id === id);
  if (!s) throw new Error(`unknown hide spot ${id}`);
  return s;
}

// ── Mom patrol points ───────────────────────────────────────────────────────

export const PATROL_POINTS: { id: string; node: string }[] = [
  { id: 'p_hall_w', node: 'hall_w' },
  { id: 'p_hall_e', node: 'hall_e' },
  { id: 'p_kitchen_n', node: 'kitchen_n' },
  { id: 'p_kitchen_s', node: 'kitchen_s' },
  { id: 'p_living', node: 'living' },
  { id: 'p_living_w', node: 'living_w' },
  { id: 'p_living_e', node: 'living_e' },
  { id: 'p_bathroom', node: 'bathroom' },
  { id: 'p_player', node: 'playerRoom' },
  // upstairs rounds — she checks the second floor too
  { id: 'p_up_hall', node: 'upHall' },
  { id: 'p_up_hall_w', node: 'up_hall_w' },
  { id: 'p_up_guest', node: 'upGuest' },
  { id: 'p_up_study', node: 'upStudy' },
  { id: 'p_up_sewing', node: 'upSewing' },
  { id: 'p_up_junk', node: 'upJunk' },
  { id: 'p_up_laundry', node: 'upLaundry' },
];
