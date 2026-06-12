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
    id: 'player_desk',
    parts: [
      { p: [10.6, 0.74, 9.62], s: [1.6, 0.06, 0.66], m: 'wood' },
      leg(9.86, 9.36, 0.74), leg(11.34, 9.36, 0.74), leg(9.86, 9.9, 0.74), leg(11.34, 9.9, 0.74),
      { p: [11.05, 0.55, 9.62], s: [0.55, 0.34, 0.6], m: 'woodDark' }, // drawer block
      { p: [10.2, 0.95, 9.4], s: [0.5, 0.35, 0.04], m: 'screen' }, // dead monitor
      { p: [10.2, 0.78, 9.45], s: [0.18, 0.07, 0.12], m: 'black' },
    ],
    colliders: [{ p: [10.6, 0.45, 9.62], s: [1.6, 0.9, 0.7] }],
  },
  {
    id: 'player_chair',
    parts: [
      { p: [10.5, 0.45, 10.3], s: [0.45, 0.06, 0.45], m: 'fabricWine' },
      { p: [10.5, 0.22, 10.3], s: [0.07, 0.45, 0.07], m: 'metal', kind: 'cylinder' },
      { p: [10.5, 0.75, 10.52], s: [0.45, 0.55, 0.07], m: 'fabricWine' },
    ],
    colliders: [{ p: [10.5, 0.5, 10.35], s: [0.5, 1.0, 0.5] }],
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
      { p: [2.75, 0.3, 4.7], s: [0.6, 0.6, 0.55], m: 'wood' },
      { p: [2.75, 0.42, 4.42], s: [0.5, 0.18, 0.03], m: 'woodDark' },
      { p: [2.75, 0.75, 4.7], s: [0.16, 0.3, 0.16], m: 'plastic', kind: 'cylinder' }, // lamp
    ],
    colliders: [{ p: [2.75, 0.35, 4.7], s: [0.6, 0.7, 0.55] }],
  },
  {
    id: 'mom_wardrobe',
    parts: [
      { p: [4.25, 1.05, 4.68], s: [1.25, 2.1, 0.65], m: 'wood' },
      { p: [3.95, 1.1, 5.03], s: [0.55, 1.9, 0.04], m: 'woodDark' },
      { p: [4.55, 1.1, 5.03], s: [0.55, 1.9, 0.04], m: 'woodDark' },
    ],
    colliders: [{ p: [4.25, 1.05, 4.68], s: [1.25, 2.1, 0.65] }],
  },
  {
    id: 'mom_dresser',
    parts: [
      { p: [1.2, 0.45, 8.6], s: [1.6, 0.9, 0.55], m: 'wood' },
      { p: [0.9, 0.62, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark' },
      { p: [1.7, 0.62, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark' },
      { p: [0.9, 0.32, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark' },
      { p: [1.7, 0.32, 8.31], s: [0.65, 0.22, 0.03], m: 'woodDark' },
    ],
    colliders: [{ p: [1.2, 0.45, 8.6], s: [1.6, 0.9, 0.55] }],
  },

  // ════ KITCHEN (x 10.5–15, z 0–9) ════
  {
    id: 'kitchen_counter',
    parts: [
      { p: [12.85, 0.45, 0.38], s: [4.2, 0.9, 0.66], m: 'woodDark' },
      { p: [12.85, 0.92, 0.38], s: [4.25, 0.05, 0.7], m: 'black' }, // countertop
      { p: [13.6, 0.93, 0.38], s: [0.55, 0.08, 0.42], m: 'metal' }, // sink
      { p: [13.6, 1.08, 0.16], s: [0.05, 0.25, 0.05], m: 'metal' }, // faucet
      { p: [12.2, 0.96, 0.38], s: [0.6, 0.04, 0.5], m: 'black' }, // stove top
      // drawers/cabinet fronts
      { p: [12.3, 0.75, 0.72], s: [0.7, 0.18, 0.03], m: 'wood' },
      { p: [13.1, 0.75, 0.72], s: [0.7, 0.18, 0.03], m: 'wood' },
      { p: [12.7, 0.35, 0.72], s: [1.5, 0.55, 0.03], m: 'wood' },
      // upper cabinets
      { p: [12.0, 1.8, 0.25], s: [2.4, 0.6, 0.4], m: 'wood' },
    ],
    colliders: [{ p: [12.85, 0.48, 0.38], s: [4.2, 0.96, 0.7] }],
  },
  {
    id: 'kitchen_fridge',
    parts: [
      { p: [14.55, 0.95, 1.4], s: [0.78, 1.9, 0.75], m: 'plastic' },
      { p: [14.14, 1.3, 1.25], s: [0.04, 0.5, 0.06], m: 'metal' }, // handle
      { p: [14.55, 1.18, 1.4], s: [0.8, 0.02, 0.77], m: 'black' }, // freezer seam
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
      { p: [4.0, 0.32, 10.85], s: [1.2, 0.12, 0.5], m: 'woodDark' }, // drawer
    ],
    colliders: [{ p: [4.0, 0.25, 10.85], s: [1.4, 0.5, 0.7] }],
  },
  {
    id: 'tv_stand',
    parts: [
      { p: [4.0, 0.28, 9.5], s: [2.4, 0.56, 0.55], m: 'wood' },
      { p: [3.4, 0.3, 9.78], s: [1.0, 0.35, 0.03], m: 'woodDark' },
      { p: [4.6, 0.3, 9.78], s: [1.0, 0.35, 0.03], m: 'woodDark' },
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
      { p: [7.9, 0.5, 12.55], s: [0.85, 1.0, 0.5], m: 'wood' },
      { p: [7.9, 0.6, 12.29], s: [0.7, 0.7, 0.03], m: 'woodDark' },
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
      { p: [6.2, 0.42, 0.4], s: [1.0, 0.84, 0.6], m: 'wood' },
      { p: [6.2, 0.87, 0.4], s: [1.05, 0.06, 0.65], m: 'porcelain' },
      { p: [6.2, 0.92, 0.38], s: [0.5, 0.1, 0.4], m: 'porcelain' },
      { p: [6.2, 1.6, 0.06], s: [0.7, 0.9, 0.04], m: 'mirror' },
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
];
