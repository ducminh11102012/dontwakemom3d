/**
 * furnitureData.ts — every piece of furniture as primitive boxes/cylinders.
 * Zero external models. Positions in world coords, y measured from floor.
 */

export type MaterialKey =
  | 'wood'
  | 'woodDark'
  | 'fabricBlue'
  | 'fabricWine'
  | 'sheet'
  | 'metal'
  | 'porcelain'
  | 'black'
  | 'screen'
  | 'cardboard'
  | 'plastic'
  | 'curtain'
  | 'mirror'
  | 'books1'
  | 'books2';

export interface Part {
  kind?: 'box' | 'cylinder';
  /** center position */
  p: [number, number, number];
  /** box: [w,h,d]; cylinder: [radiusTop, height, radiusBottom?] */
  s: [number, number, number];
  m: MaterialKey;
  rotY?: number;
  /** hide this part when the named search-spot's open animation is active */
  hideForSpot?: string;
}

export interface ColliderBox {
  p: [number, number, number];
  s: [number, number, number];
}

export interface FurnitureItem {
  id: string;
  parts: Part[];
  colliders: ColliderBox[];
}

const leg = (x: number, z: number, h = 0.3, m: MaterialKey = 'woodDark'): Part => ({
  p: [x, h / 2, z],
  s: [0.07, h, 0.07],
  m,
});

/** lift a part to the upstairs floor (y += 2.85) */
const up = (part: Part): Part => ({ ...part, p: [part.p[0], part.p[1] + 2.85, part.p[2]] });

export const FURNITURE: FurnitureItem[] = [
  // ════ PLAYER BEDROOM (x 9–15, z 9–13) ════
  {
    id: 'player_bed',
    parts: [
      leg(13.0, 9.55, 0.32), leg(14.8, 9.55, 0.32), leg(13.0, 11.25, 0.32), leg(14.8, 11.25, 0.32),
      { p: [13.9, 0.38, 10.4], s: [2.0, 0.12, 1.9], m: 'wood' },
      { p: [13.9, 0.53, 10.4], s: [1.9, 0.18, 1.8], m: 'fabricBlue' },
      { p: [13.9, 0.66, 10.7], s: [1.85, 0.08, 1.1], m: 'sheet' }, // blanket
      { p: [13.9, 0.665, 9.85], s: [0.7, 0.1, 0.5], m: 'sheet' }, // pillow
      { p: [14.92, 0.7, 10.4], s: [0.08, 1.0, 1.9], m: 'wood' }, // headboard (east wall)
    ],
    colliders: [{ p: [13.9, 0.45, 10.4], s: [2.0, 0.9, 1.9] }],
  },
  {
    // desk on the NORTH wall — keeps the doorway (x 9.3–10.4 at z=9) clear
    id: 'player_desk',
    parts: [
      { p: [12.4, 0.74, 12.38], s: [1.6, 0.06, 0.66], m: 'wood' },
      leg(11.66, 12.64, 0.74), leg(13.14, 12.64, 0.74), leg(11.66, 12.1, 0.74), leg(13.14, 12.1, 0.74),
      { p: [12.85, 0.55, 12.43], s: [0.55, 0.34, 0.50], m: 'woodDark', hideForSpot: 'player_desk' }, // drawer block
      { p: [12.0, 0.95, 12.6], s: [0.5, 0.35, 0.04], m: 'screen' }, // dead monitor
      { p: [12.0, 0.78, 12.55], s: [0.18, 0.07, 0.12], m: 'black' },
    ],
    colliders: [{ p: [12.4, 0.45, 12.38], s: [1.6, 0.9, 0.7] }],
  },
  {
    id: 'player_chair',
    parts: [
      { p: [11.8, 0.45, 11.85], s: [0.45, 0.06, 0.45], m: 'fabricWine' },
      { p: [11.8, 0.22, 11.85], s: [0.07, 0.45, 0.07], m: 'metal', kind: 'cylinder' },
      { p: [11.8, 0.75, 11.63], s: [0.45, 0.55, 0.07], m: 'fabricWine' },
    ],
    colliders: [{ p: [11.8, 0.5, 11.8], s: [0.5, 1.0, 0.5] }],
  },
  {
    id: 'player_wardrobe',
    parts: [
      { p: [10.0, 1.0, 12.62], s: [1.15, 2.0, 0.62], m: 'wood' },
      { p: [9.72, 1.05, 12.29], s: [0.5, 1.8, 0.04], m: 'woodDark' },
      { p: [10.28, 1.05, 12.29], s: [0.5, 1.8, 0.04], m: 'woodDark' },
      { p: [10.0, 1.05, 12.27], s: [0.03, 1.7, 0.03], m: 'metal' },
    ],
    colliders: [{ p: [10.0, 1.0, 12.62], s: [1.15, 2.0, 0.62] }],
  },
  {
    id: 'player_rug',
    parts: [{ p: [11.8, 0.012, 11.2], s: [1.8, 0.02, 1.4], m: 'fabricWine' }],
    colliders: [],
  },

  // ════ MOM'S BEDROOM (x 0–5, z 4–9) ════
  {
    id: 'mom_bed',
    parts: [
      leg(0.45, 4.55, 0.32), leg(2.15, 4.55, 0.32), leg(0.45, 6.65, 0.32), leg(2.15, 6.65, 0.32),
      { p: [1.3, 0.38, 5.6], s: [2.0, 0.12, 2.3], m: 'wood' },
      { p: [1.3, 0.54, 5.6], s: [1.9, 0.2, 2.2], m: 'fabricWine' },
      { p: [1.3, 0.68, 5.95], s: [1.85, 0.09, 1.45], m: 'sheet' },
      { p: [1.3, 0.85, 4.44], s: [2.0, 1.1, 0.08], m: 'wood' }, // headboard north
    ],
    colliders: [{ p: [1.3, 0.45, 5.6], s: [2.0, 0.9, 2.3] }],
  },
  {
    id: 'mom_nightstand',
    parts: [
      { p: [2.75, 0.3, 4.75], s: [0.6, 0.6, 0.45], m: 'wood' },
      { p: [2.75, 0.42, 4.42], s: [0.5, 0.18, 0.03], m: 'woodDark', hideForSpot: 'mom_nightstand' },
      { p: [2.75, 0.75, 4.7], s: [0.16, 0.3, 0.16], m: 'plastic', kind: 'cylinder' }, // lamp
    ],
    colliders: [{ p: [2.75, 0.35, 4.7], s: [0.6, 0.7, 0.55] }],
  },
  {
    id: 'mom_wardrobe',
    parts: [
      { p: [4.25, 1.05, 4.62], s: [1.25, 2.1, 0.53], m: 'wood' },
      { p: [3.95, 1.1, 5.03], s: [0.55, 1.9, 0.04], m: 'woodDark', hideForSpot: 'mom_wardrobe' },
      { p: [4.55, 1.1, 5.03], s: [0.55, 1.9, 0.04], m: 'woodDark', hideForSpot: 'mom_wardrobe' },
    ],
    colliders: [{ p: [4.25, 1.05, 4.68], s: [1.25, 2.1, 0.65] }],
  },
  {
    id: 'mom_dresser',
    parts: [
      { p: [1.2, 0.45, 8.65], s: [1.6, 0.9, 0.45], m: 'wood' },
      { p: [0.9, 0.62, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark', hideForSpot: 'mom_dresser1' },
      { p: [1.7, 0.62, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark', hideForSpot: 'mom_dresser1' },
      { p: [0.9, 0.32, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark', hideForSpot: 'mom_dresser2' },
      { p: [1.7, 0.32, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark', hideForSpot: 'mom_dresser2' },
    ],
    colliders: [{ p: [1.2, 0.45, 8.6], s: [1.6, 0.9, 0.55] }],
  },

  // ════ KITCHEN (x 10.5–15, z 0–9) ════
  {
    id: 'kitchen_counter',
    parts: [
      { p: [12.85, 0.45, 0.33], s: [4.2, 0.9, 0.56], m: 'woodDark' },
      { p: [12.85, 0.92, 0.38], s: [4.25, 0.05, 0.7], m: 'black' }, // countertop
      { p: [13.6, 0.93, 0.38], s: [0.55, 0.08, 0.42], m: 'metal' }, // sink
      { p: [13.6, 1.08, 0.16], s: [0.05, 0.25, 0.05], m: 'metal' }, // faucet
      { p: [12.2, 0.96, 0.38], s: [0.6, 0.04, 0.5], m: 'black' }, // stove top
      // drawers/cabinet fronts — hidden when container opens
      { p: [12.3, 0.75, 0.72], s: [0.7, 0.18, 0.03], m: 'wood', hideForSpot: 'kitchen_drawer1' },
      { p: [13.1, 0.75, 0.72], s: [0.7, 0.18, 0.03], m: 'wood', hideForSpot: 'kitchen_drawer2' },
      { p: [12.7, 0.35, 0.72], s: [1.5, 0.55, 0.03], m: 'wood', hideForSpot: 'kitchen_cab1' },
      // upper cabinets
      { p: [12.0, 1.8, 0.2], s: [2.4, 0.6, 0.3], m: 'wood', hideForSpot: 'kitchen_cab2' },
    ],
    colliders: [{ p: [12.85, 0.48, 0.38], s: [4.2, 0.96, 0.7] }],
  },
  {
    id: 'kitchen_fridge',
    parts: [
      { p: [14.62, 0.95, 1.4], s: [0.64, 1.9, 0.75], m: 'plastic' },
      { p: [14.14, 1.3, 1.25], s: [0.04, 0.5, 0.06], m: 'metal', hideForSpot: 'kitchen_fridge' }, // handle
      { p: [14.55, 1.18, 1.4], s: [0.8, 0.02, 0.77], m: 'black', hideForSpot: 'kitchen_fridge' }, // freezer seam
    ],
    colliders: [{ p: [14.55, 0.95, 1.4], s: [0.78, 1.9, 0.75] }],
  },
  {
    id: 'kitchen_rice',
    parts: [
      { p: [11.4, 1.06, 0.45], s: [0.16, 0.28, 0.16], m: 'plastic', kind: 'cylinder' },
      { p: [11.4, 1.22, 0.45], s: [0.17, 0.04, 0.17], m: 'woodDark', kind: 'cylinder' },
    ],
    colliders: [],
  },
  {
    id: 'kitchen_table',
    parts: [
      { p: [12.6, 0.73, 4.9], s: [1.4, 0.06, 1.2], m: 'wood' },
      leg(12.0, 4.4, 0.73), leg(13.2, 4.4, 0.73), leg(12.0, 5.4, 0.73), leg(13.2, 5.4, 0.73),
      // chairs
      { p: [12.0, 0.45, 5.85], s: [0.42, 0.05, 0.42], m: 'wood' },
      { p: [12.0, 0.22, 5.85], s: [0.05, 0.45, 0.05], m: 'woodDark' },
      { p: [12.0, 0.78, 6.04], s: [0.42, 0.6, 0.05], m: 'wood' },
      { p: [13.2, 0.45, 3.95], s: [0.42, 0.05, 0.42], m: 'wood' },
      { p: [13.2, 0.22, 3.95], s: [0.05, 0.45, 0.05], m: 'woodDark' },
      { p: [13.2, 0.78, 3.76], s: [0.42, 0.6, 0.05], m: 'wood' },
    ],
    colliders: [{ p: [12.6, 0.4, 4.9], s: [1.5, 0.8, 1.3] }],
  },

  // ════ LIVING ROOM (x 0–9, z 9–13) ════
  {
    id: 'sofa',
    parts: [
      { p: [4.0, 0.28, 11.9], s: [2.8, 0.32, 0.95], m: 'fabricWine' },
      { p: [4.0, 0.52, 11.9], s: [2.7, 0.18, 0.85], m: 'fabricWine' }, // cushions
      { p: [4.0, 0.65, 12.3], s: [2.8, 0.75, 0.22], m: 'fabricWine' }, // back
      { p: [2.7, 0.55, 11.9], s: [0.22, 0.55, 0.95], m: 'fabricWine' }, // arms
      { p: [5.3, 0.55, 11.9], s: [0.22, 0.55, 0.95], m: 'fabricWine' },
    ],
    colliders: [{ p: [4.0, 0.5, 12.0], s: [2.85, 1.0, 1.1] }],
  },
  {
    id: 'coffee_table',
    parts: [
      { p: [4.0, 0.42, 10.85], s: [1.4, 0.05, 0.7], m: 'wood' },
      leg(3.4, 10.6, 0.42), leg(4.6, 10.6, 0.42), leg(3.4, 11.1, 0.42), leg(4.6, 11.1, 0.42),
      { p: [4.0, 0.32, 10.85], s: [1.2, 0.12, 0.5], m: 'woodDark', hideForSpot: 'living_coffee' }, // drawer
    ],
    colliders: [{ p: [4.0, 0.25, 10.85], s: [1.4, 0.5, 0.7] }],
  },
  {
    id: 'tv_stand',
    parts: [
      { p: [4.0, 0.28, 9.45], s: [2.4, 0.56, 0.45], m: 'wood' },
      { p: [3.4, 0.3, 9.78], s: [1.0, 0.35, 0.03], m: 'woodDark', hideForSpot: 'living_tv' },
      { p: [4.6, 0.3, 9.78], s: [1.0, 0.35, 0.03], m: 'woodDark', hideForSpot: 'living_tv' },
      { p: [4.0, 1.12, 9.45], s: [1.7, 1.0, 0.07], m: 'screen' }, // TV
    ],
    colliders: [{ p: [4.0, 0.6, 9.5], s: [2.4, 1.6, 0.55] }],
  },
  {
    id: 'bookshelf',
    parts: [
      { p: [0.55, 0.95, 10.85], s: [0.8, 1.9, 1.7], m: 'wood', rotY: Math.PI / 2 },
      { p: [0.55, 1.5, 10.5], s: [0.6, 0.35, 0.6], m: 'books1', rotY: Math.PI / 2 },
      { p: [0.55, 1.5, 11.3], s: [0.6, 0.35, 0.55], m: 'books2', rotY: Math.PI / 2 },
      { p: [0.55, 0.95, 10.9], s: [0.6, 0.35, 1.4], m: 'books2', rotY: Math.PI / 2 },
      { p: [0.55, 0.45, 10.7], s: [0.6, 0.35, 0.9], m: 'books1', rotY: Math.PI / 2 },
    ],
    colliders: [{ p: [0.5, 0.95, 10.85], s: [0.85, 1.9, 1.75] }],
  },
  {
    id: 'curtains_living',
    parts: [
      { p: [0.16, 1.25, 10.35], s: [0.14, 2.4, 0.55], m: 'curtain' },
      { p: [0.16, 1.25, 11.65], s: [0.14, 2.4, 0.55], m: 'curtain' },
      { p: [0.2, 2.42, 11.0], s: [0.05, 0.05, 1.9], m: 'metal' }, // rod
    ],
    colliders: [],
  },
  {
    id: 'side_cabinet',
    parts: [
      { p: [7.9, 0.5, 12.60], s: [0.85, 1.0, 0.40], m: 'wood' },
      { p: [7.9, 0.6, 12.29], s: [0.7, 0.7, 0.03], m: 'woodDark', hideForSpot: 'living_cabinet' },
    ],
    colliders: [{ p: [7.9, 0.5, 12.55], s: [0.85, 1.0, 0.5] }],
  },
  {
    id: 'living_rug',
    parts: [{ p: [4.0, 0.012, 11.1], s: [3.4, 0.02, 2.0], m: 'fabricBlue' }],
    colliders: [],
  },
  {
    id: 'wall_clock',
    parts: [
      { p: [4.5, 2.0, 9.08], s: [0.22, 0.05, 0.22], m: 'plastic', kind: 'cylinder' },
      { p: [4.5, 2.0, 9.05], s: [0.18, 0.01, 0.18], m: 'sheet', kind: 'cylinder' },
    ],
    colliders: [],
  },

  // ════ BATHROOM (x 5–10.5, z 0–4) ════
  {
    id: 'bath_sink',
    parts: [
      { p: [6.2, 0.42, 0.35], s: [1.0, 0.84, 0.50], m: 'wood' },
      { p: [6.2, 0.87, 0.4], s: [1.05, 0.06, 0.65], m: 'porcelain' },
      { p: [6.2, 0.92, 0.38], s: [0.5, 0.1, 0.4], m: 'porcelain' },
      { p: [6.2, 1.6, 0.06], s: [0.7, 0.9, 0.04], m: 'mirror', hideForSpot: 'bath_mirror' },
    ],
    colliders: [{ p: [6.2, 0.45, 0.4], s: [1.05, 0.95, 0.65] }],
  },
  {
    id: 'toilet',
    parts: [
      { p: [7.6, 0.2, 0.5], s: [0.4, 0.4, 0.55], m: 'porcelain' },
      { p: [7.6, 0.43, 0.5], s: [0.45, 0.07, 0.6], m: 'porcelain' },
      { p: [7.6, 0.55, 0.15], s: [0.45, 0.6, 0.2], m: 'porcelain' },
    ],
    colliders: [{ p: [7.6, 0.4, 0.45], s: [0.5, 0.8, 0.65] }],
  },
  {
    id: 'shower',
    parts: [
      { p: [9.6, 0.06, 3.2], s: [1.5, 0.12, 1.4], m: 'porcelain' },
      { p: [10.42, 1.6, 3.2], s: [0.06, 1.2, 0.06], m: 'metal' }, // pipe
      { p: [10.3, 2.15, 3.2], s: [0.16, 0.05, 0.16], m: 'metal', kind: 'cylinder' },
      { p: [8.88, 1.35, 3.2], s: [0.04, 2.0, 1.35], m: 'curtain' }, // curtain
      { p: [9.6, 2.38, 2.52], s: [1.5, 0.04, 0.04], m: 'metal' }, // rod
    ],
    colliders: [],
  },
  {
    id: 'laundry_basket',
    parts: [{ p: [9.9, 0.3, 0.8], s: [0.3, 0.6, 0.28], m: 'plastic', kind: 'cylinder' }],
    colliders: [{ p: [9.9, 0.3, 0.8], s: [0.6, 0.6, 0.6] }],
  },

  // ════ STORAGE (x 0–5, z 0–4) ════
  {
    id: 'storage_shelves',
    parts: [
      { p: [0.4, 0.5, 2.5], s: [0.7, 0.04, 2.0], m: 'wood' },
      { p: [0.4, 1.1, 2.5], s: [0.7, 0.04, 2.0], m: 'wood' },
      { p: [0.4, 1.7, 2.5], s: [0.7, 0.04, 2.0], m: 'wood' },
      { p: [0.08, 1.0, 1.55], s: [0.06, 2.0, 0.06], m: 'metal' },
      { p: [0.72, 1.0, 1.55], s: [0.06, 2.0, 0.06], m: 'metal' },
      { p: [0.08, 1.0, 3.45], s: [0.06, 2.0, 0.06], m: 'metal' },
      { p: [0.72, 1.0, 3.45], s: [0.06, 2.0, 0.06], m: 'metal' },
      { p: [0.4, 0.72, 2.0], s: [0.55, 0.4, 0.6], m: 'cardboard' },
      { p: [0.4, 1.32, 2.9], s: [0.55, 0.4, 0.65], m: 'cardboard' },
      { p: [0.4, 1.9, 2.2], s: [0.5, 0.35, 0.55], m: 'cardboard' },
    ],
    colliders: [{ p: [0.4, 1.0, 2.5], s: [0.8, 2.0, 2.0] }],
  },
  {
    id: 'storage_bigbox',
    parts: [
      { p: [3.6, 0.45, 0.9], s: [0.95, 0.9, 0.85], m: 'cardboard' },
      { p: [3.6, 0.92, 0.52], s: [0.95, 0.06, 0.2], m: 'cardboard' }, // open flap
    ],
    colliders: [{ p: [3.6, 0.45, 0.65], s: [0.95, 0.9, 0.4] }],
  },
  {
    id: 'storage_searchbox',
    parts: [{ p: [1.0, 0.3, 0.8], s: [0.8, 0.6, 0.7], m: 'cardboard' }],
    colliders: [{ p: [1.0, 0.3, 0.8], s: [0.8, 0.6, 0.7] }],
  },
  {
    id: 'storage_clutter',
    parts: [
      { p: [2.2, 0.25, 0.7], s: [0.26, 0.5, 0.26], m: 'plastic', kind: 'cylinder' },
      { p: [4.3, 0.25, 3.3], s: [0.7, 0.5, 0.55], m: 'cardboard' },
      { p: [4.5, 0.62, 3.2], s: [0.35, 0.25, 0.3], m: 'cardboard' },
      { p: [2.9, 0.2, 3.5], s: [0.5, 0.4, 0.4], m: 'cardboard' },
    ],
    colliders: [
      { p: [4.35, 0.4, 3.3], s: [0.75, 0.8, 0.6] },
      { p: [2.9, 0.2, 3.5], s: [0.5, 0.4, 0.4] },
    ],
  },

  // ════ HALLWAY (x 5–10.5, z 4–9) ════
  {
    id: 'hall_runner',
    parts: [{ p: [7.75, 0.012, 6.5], s: [4.4, 0.02, 1.1], m: 'fabricWine' }],
    colliders: [],
  },
  {
    id: 'hall_frames',
    parts: [
      { p: [6.5, 1.7, 4.06], s: [0.45, 0.6, 0.04], m: 'woodDark' },
      { p: [6.5, 1.7, 4.04], s: [0.35, 0.5, 0.04], m: 'screen' },
      { p: [9.0, 1.75, 4.06], s: [0.6, 0.45, 0.04], m: 'woodDark' },
      { p: [9.0, 1.75, 4.04], s: [0.5, 0.35, 0.04], m: 'screen' },
    ],
    colliders: [],
  },

  // ═══════════════════════════ UPSTAIRS (y + 2.85) ═══════════════════════════

  // ════ GUEST BEDROOM (x 5–10.5, z 0–4.6) ════
  {
    id: 'guest_bed',
    parts: [
      up(leg(5.6, 0.6, 0.32)), up(leg(7.2, 0.6, 0.32)), up(leg(5.6, 2.6, 0.32)), up(leg(7.2, 2.6, 0.32)),
      { p: [6.4, 3.23, 1.6], s: [1.9, 0.12, 2.1], m: 'wood' },
      { p: [6.4, 3.38, 1.6], s: [1.8, 0.18, 2.0], m: 'fabricBlue' },
      { p: [6.4, 3.51, 1.95], s: [1.75, 0.08, 1.25], m: 'sheet' }, // blanket
      { p: [6.4, 3.7, 0.49], s: [1.9, 1.0, 0.08], m: 'wood' }, // headboard north
    ],
    colliders: [{ p: [6.4, 3.3, 1.6], s: [1.9, 0.9, 2.1] }],
  },
  {
    id: 'guest_nightstand',
    parts: [
      { p: [7.9, 3.15, 0.70], s: [0.6, 0.6, 0.45], m: 'wood' },
      { p: [7.9, 3.30, 1.04], s: [0.5, 0.22, 0.03], m: 'woodDark', hideForSpot: 'guest_nightstand' }, // drawer front
      { p: [7.9, 3.75, 0.75], s: [0.14, 0.26, 0.14], m: 'plastic', kind: 'cylinder' }, // dusty lamp
    ],
    colliders: [{ p: [7.9, 3.2, 0.75], s: [0.6, 0.7, 0.55] }],
  },
  {
    id: 'guest_wardrobe',
    parts: [
      { p: [10.20, 3.85, 1.0], s: [0.50, 2.0, 1.15], m: 'wood' },
      { p: [9.79, 3.9, 0.72], s: [0.04, 1.8, 0.5], m: 'woodDark', hideForSpot: 'guest_wardrobe' },
      { p: [9.79, 3.9, 1.28], s: [0.04, 1.8, 0.5], m: 'woodDark', hideForSpot: 'guest_wardrobe' },
      { p: [9.77, 3.9, 1.0], s: [0.03, 1.7, 0.03], m: 'metal', hideForSpot: 'guest_wardrobe' },
    ],
    colliders: [{ p: [10.13, 3.85, 1.0], s: [0.65, 2.0, 1.15] }],
  },
  {
    id: 'guest_rug',
    parts: [{ p: [6.4, 2.862, 3.3], s: [2.0, 0.02, 1.2], m: 'fabricWine' }],
    colliders: [],
  },

  // ════ CCTV ROOM (x 0–5, z 0–4.6) — was Study ════
  {
    // Main CCTV console desk against the north wall
    id: 'cctv_desk',
    parts: [
      // desk surface
      { p: [2.5, 3.59, 0.65], s: [3.6, 0.06, 0.72], m: 'woodDark' },
      // desk legs
      up(leg(0.78, 0.32, 0.74)), up(leg(4.22, 0.32, 0.74)),
      up(leg(0.78, 0.92, 0.74)), up(leg(4.22, 0.92, 0.74)),
      // desk panel (front face)
      { p: [2.5, 3.22, 1.0], s: [3.6, 0.68, 0.04], m: 'woodDark' },
      // drawer block
      { p: [3.8, 3.4, 0.60], s: [0.55, 0.32, 0.46], m: 'woodDark', hideForSpot: 'study_desk' },
    ],
    colliders: [{ p: [2.5, 3.3, 0.65], s: [3.6, 0.9, 0.72] }],
  },
  {
    // Three CCTV monitors on the desk
    id: 'cctv_monitors',
    parts: [
      // Left monitor (frame + screen)
      { p: [1.2, 4.1, 0.45], s: [1.05, 0.75, 0.06], m: 'black' },   // frame
      { p: [1.2, 4.1, 0.41], s: [0.92, 0.62, 0.02], m: 'screen' },   // screen
      { p: [1.2, 3.68, 0.50], s: [0.35, 0.12, 0.22], m: 'black' },   // stand base
      { p: [1.2, 3.72, 0.48], s: [0.06, 0.08, 0.04], m: 'metal' },   // stand neck
      // Center monitor (larger — main view)
      { p: [2.5, 4.15, 0.42], s: [1.2, 0.85, 0.06], m: 'black' },    // frame
      { p: [2.5, 4.15, 0.38], s: [1.06, 0.72, 0.02], m: 'screen' },  // screen
      { p: [2.5, 3.68, 0.48], s: [0.40, 0.12, 0.24], m: 'black' },   // stand base
      { p: [2.5, 3.72, 0.46], s: [0.06, 0.08, 0.04], m: 'metal' },   // stand neck
      // Right monitor
      { p: [3.8, 4.1, 0.45], s: [1.05, 0.75, 0.06], m: 'black' },    // frame
      { p: [3.8, 4.1, 0.41], s: [0.92, 0.62, 0.02], m: 'screen' },   // screen
      { p: [3.8, 3.68, 0.50], s: [0.35, 0.12, 0.22], m: 'black' },   // stand base
      { p: [3.8, 3.72, 0.48], s: [0.06, 0.08, 0.04], m: 'metal' },   // stand neck
    ],
    colliders: [],
  },
  {
    // CCTV monitor green status LEDs (emissive glow)
    id: 'cctv_leds',
    parts: [
      { p: [1.2, 3.72, 0.39], s: [0.04, 0.04, 0.02], m: 'screen' },
      { p: [2.5, 3.72, 0.37], s: [0.04, 0.04, 0.02], m: 'screen' },
      { p: [3.8, 3.72, 0.39], s: [0.04, 0.04, 0.02], m: 'screen' },
    ],
    colliders: [],
  },
  {
    // Swivel chair
    id: 'cctv_chair',
    parts: [
      { p: [2.5, 3.3, 1.7], s: [0.48, 0.06, 0.48], m: 'fabricWine' },
      { p: [2.5, 3.07, 1.7], s: [0.07, 0.45, 0.07], m: 'metal', kind: 'cylinder' },
      { p: [2.5, 3.62, 1.92], s: [0.48, 0.58, 0.07], m: 'fabricWine' },
    ],
    colliders: [{ p: [2.5, 3.35, 1.7], s: [0.5, 1.0, 0.5] }],
  },
  {
    // Server rack / equipment against the west wall
    id: 'cctv_rack',
    parts: [
      // rack frame
      { p: [0.5, 3.8, 2.5], s: [0.65, 1.9, 1.3], m: 'metal' },
      // rack units (blinking equipment)
      { p: [0.85, 4.35, 2.2], s: [0.02, 0.12, 0.8], m: 'screen' },
      { p: [0.85, 4.05, 2.2], s: [0.02, 0.12, 0.8], m: 'screen' },
      { p: [0.85, 3.75, 2.5], s: [0.02, 0.12, 0.8], m: 'black' },
      { p: [0.85, 3.45, 2.5], s: [0.02, 0.12, 0.8], m: 'black' },
      // cables at the bottom
      { p: [0.4, 2.95, 2.8], s: [0.35, 0.15, 0.25], m: 'black' },
    ],
    colliders: [{ p: [0.5, 3.8, 2.5], s: [0.7, 1.9, 1.35] }],
  },
  {
    // File cabinet (searchable) — reuses study_cabinet spot id
    id: 'cctv_cabinet',
    parts: [
      { p: [4.3, 3.45, 0.60], s: [0.55, 1.2, 0.45], m: 'metal' },
      { p: [4.3, 3.75, 0.94], s: [0.45, 0.25, 0.03], m: 'black', hideForSpot: 'study_cabinet' },
      { p: [4.3, 3.25, 0.94], s: [0.45, 0.25, 0.03], m: 'black', hideForSpot: 'study_cabinet' },
    ],
    colliders: [{ p: [4.3, 3.45, 0.65], s: [0.55, 1.2, 0.55] }],
  },
  {
    // Small side table with recording equipment
    id: 'cctv_side_table',
    parts: [
      { p: [4.3, 3.3, 3.5], s: [0.65, 0.9, 0.6], m: 'wood' },
      // VCR / DVR unit
      { p: [4.3, 3.82, 3.5], s: [0.55, 0.12, 0.45], m: 'black' },
      // small red recording LED
      { p: [4.55, 3.9, 3.25], s: [0.03, 0.03, 0.02], m: 'screen' },
    ],
    colliders: [{ p: [4.3, 3.3, 3.5], s: [0.65, 0.9, 0.6] }],
  },
  {
    // Dark carpet / anti-fatigue mat
    id: 'cctv_rug',
    parts: [{ p: [2.5, 2.862, 1.8], s: [2.8, 0.02, 1.4], m: 'black' }],
    colliders: [],
  },

  // ════ SEWING ROOM (x 10.5–15, z 0–4.6) ════
  {
    id: 'sewing_table',
    parts: [
      { p: [12.5, 3.59, 1.0], s: [1.6, 0.06, 0.72], m: 'wood' },
      up(leg(11.78, 0.68, 0.74)), up(leg(13.22, 0.68, 0.74)), up(leg(11.78, 1.32, 0.74)), up(leg(13.22, 1.32, 0.74)),
      // old sewing machine
      { p: [12.5, 3.78, 0.95], s: [0.55, 0.3, 0.25], m: 'black' },
      { p: [12.3, 3.95, 0.95], s: [0.12, 0.1, 0.2], m: 'black' },
      { p: [12.5, 3.4, 1.35], s: [0.5, 0.3, 0.04], m: 'woodDark', hideForSpot: 'sewing_drawer' }, // drawer front
    ],
    colliders: [{ p: [12.5, 3.3, 1.0], s: [1.6, 0.9, 0.75] }],
  },
  {
    id: 'sewing_basket',
    parts: [{ p: [14.3, 3.05, 0.8], s: [0.6, 0.4, 0.5], m: 'wood' }],
    colliders: [{ p: [14.3, 3.05, 0.8], s: [0.6, 0.4, 0.5] }],
  },
  {
    id: 'sewing_cabinet',
    parts: [
      { p: [14.68, 3.85, 3.4], s: [0.52, 2.0, 1.1], m: 'wood' },
      { p: [14.28, 3.9, 3.13], s: [0.04, 1.8, 0.48], m: 'woodDark', hideForSpot: 'sewing_cabinet' },
      { p: [14.28, 3.9, 3.67], s: [0.04, 1.8, 0.48], m: 'woodDark', hideForSpot: 'sewing_cabinet' },
    ],
    colliders: [{ p: [14.62, 3.85, 3.4], s: [0.65, 2.0, 1.1] }],
  },
  {
    id: 'sewing_mannequin',
    parts: [
      { p: [11.2, 3.1, 3.7], s: [0.22, 0.5, 0.22], m: 'woodDark', kind: 'cylinder' }, // stand
      { p: [11.2, 3.9, 3.7], s: [0.26, 0.85, 0.22], m: 'sheet', kind: 'cylinder' }, // torso
      { p: [11.2, 4.45, 3.7], s: [0.06, 0.18, 0.06], m: 'woodDark', kind: 'cylinder' }, // neck
    ],
    colliders: [{ p: [11.2, 3.7, 3.7], s: [0.55, 1.7, 0.55] }],
  },

  // ════ UPSTAIRS HALLWAY (z 4.6–9) ════
  {
    id: 'up_hall_runner',
    parts: [{ p: [7.0, 2.862, 6.8], s: [9.0, 0.02, 1.1], m: 'fabricWine' }],
    colliders: [],
  },
  {
    id: 'up_hall_console',
    parts: [
      { p: [4.9, 3.3, 8.62], s: [1.1, 0.9, 0.4], m: 'wood' },
      { p: [4.9, 3.82, 8.62], s: [0.16, 0.24, 0.16], m: 'porcelain', kind: 'cylinder' }, // vase
    ],
    colliders: [{ p: [4.9, 3.3, 8.62], s: [1.1, 0.9, 0.4] }],
  },
  {
    id: 'up_hall_frames',
    parts: [
      { p: [5.6, 4.55, 4.71], s: [0.5, 0.65, 0.04], m: 'woodDark' },
      { p: [5.6, 4.55, 4.73], s: [0.4, 0.55, 0.04], m: 'screen' },
      { p: [9.6, 4.6, 4.71], s: [0.65, 0.5, 0.04], m: 'woodDark' },
      { p: [9.6, 4.6, 4.73], s: [0.55, 0.4, 0.04], m: 'screen' },
    ],
    colliders: [],
  },

  // ════ JUNK ROOM (x 0–7.5, z 9–13) ════
  {
    id: 'junk_boxes_s',
    parts: [
      { p: [1.0, 3.15, 12.3], s: [0.8, 0.6, 0.7], m: 'cardboard' },
      { p: [2.4, 3.15, 12.4], s: [0.75, 0.6, 0.65], m: 'cardboard' },
      { p: [2.3, 3.7, 12.45], s: [0.5, 0.45, 0.5], m: 'cardboard' },
      { p: [6.8, 3.13, 12.5], s: [0.9, 0.55, 0.75], m: 'wood' }, // crate
      { p: [5.6, 3.05, 12.55], s: [0.6, 0.4, 0.5], m: 'cardboard' },
    ],
    colliders: [
      { p: [1.7, 3.3, 12.4], s: [2.3, 0.9, 0.75] },
      { p: [6.2, 3.2, 12.5], s: [2.0, 0.7, 0.8] },
    ],
  },
  {
    id: 'junk_sheet_furniture',
    parts: [
      // furniture hidden under a dust sheet — you can crawl under it
      { p: [1.0, 3.4, 10.3], s: [1.3, 1.1, 1.0], m: 'sheet' },
      { p: [0.95, 4.0, 10.3], s: [0.7, 0.15, 0.8], m: 'sheet' },
    ],
    colliders: [{ p: [1.0, 3.4, 10.3], s: [1.3, 1.1, 1.0] }],
  },
  {
    id: 'junk_clutter',
    parts: [
      { p: [4.2, 3.5, 9.6], s: [0.5, 1.3, 0.5], m: 'sheet' }, // covered lamp
      { p: [3.0, 3.1, 9.8], s: [0.45, 0.5, 0.45], m: 'cardboard' },
      { p: [5.9, 3.3, 9.7], s: [0.45, 0.9, 0.5], m: 'woodDark' }, // old chair stack
      { p: [5.9, 3.85, 9.85], s: [0.45, 0.4, 0.07], m: 'woodDark' },
      { p: [0.6, 3.05, 11.6], s: [0.3, 0.4, 0.3], m: 'plastic', kind: 'cylinder' }, // paint bucket
    ],
    colliders: [
      { p: [4.2, 3.5, 9.6], s: [0.5, 1.3, 0.5] },
      { p: [5.9, 3.4, 9.75], s: [0.5, 1.1, 0.6] },
      { p: [3.0, 3.1, 9.8], s: [0.45, 0.5, 0.45] },
    ],
  },

  // ════ LAUNDRY ROOM (x 7.5–15, z 9–13) ════
  {
    id: 'laundry_washer',
    parts: [
      { p: [8.2, 3.3, 12.50], s: [0.72, 0.9, 0.58], m: 'plastic' },
      { p: [8.2, 3.35, 12.1], s: [0.34, 0.04, 0.34], m: 'mirror', kind: 'cylinder', rotY: 0, hideForSpot: 'laundry_machine' }, // porthole
      { p: [8.2, 3.71, 12.3], s: [0.5, 0.06, 0.2], m: 'black', hideForSpot: 'laundry_machine' }, // control panel
    ],
    colliders: [{ p: [8.2, 3.3, 12.45], s: [0.72, 0.9, 0.68] }],
  },
  {
    id: 'laundry_dryer',
    parts: [
      { p: [9.15, 3.3, 12.45], s: [0.72, 0.9, 0.68], m: 'porcelain' },
      { p: [9.15, 3.35, 12.1], s: [0.3, 0.04, 0.3], m: 'black', kind: 'cylinder' },
    ],
    colliders: [{ p: [9.15, 3.3, 12.45], s: [0.72, 0.9, 0.68] }],
  },
  {
    id: 'laundry_shelf_unit',
    parts: [
      { p: [14.65, 3.35, 11.5], s: [0.6, 0.04, 1.6], m: 'wood' },
      { p: [14.65, 3.95, 11.5], s: [0.6, 0.04, 1.6], m: 'wood' },
      { p: [14.65, 4.55, 11.5], s: [0.6, 0.04, 1.6], m: 'wood' },
      { p: [14.65, 3.6, 11.1], s: [0.45, 0.35, 0.4], m: 'plastic' }, // detergent
      { p: [14.65, 4.18, 11.9], s: [0.5, 0.35, 0.5], m: 'cardboard' },
    ],
    colliders: [{ p: [14.65, 3.85, 11.5], s: [0.7, 2.0, 1.65] }],
  },
  {
    id: 'laundry_pile_visual',
    parts: [
      // mountain of unwashed clothes — big enough to burrow into
      { p: [12.5, 3.05, 12.3], s: [1.7, 0.45, 1.3], m: 'fabricBlue' },
      { p: [12.3, 3.3, 12.4], s: [1.1, 0.35, 0.9], m: 'fabricWine' },
      { p: [12.8, 3.45, 12.2], s: [0.7, 0.3, 0.6], m: 'sheet' },
    ],
    colliders: [],
  },
  {
    id: 'laundry_hamper',
    parts: [{ p: [10.2, 3.15, 12.4], s: [0.3, 0.6, 0.28], m: 'plastic', kind: 'cylinder' }],
    colliders: [{ p: [10.2, 3.15, 12.4], s: [0.6, 0.6, 0.6] }],
  },
];
