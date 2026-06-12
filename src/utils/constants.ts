/**
 * utils/constants.ts
 * ------------------
 * Compatibility shim: the Phase 2 brief places level constants at
 * `src/utils/constants.ts`, but the project convention since Phase 0 is ONE
 * central constants file at `src/constants.ts`. Everything is defined there;
 * this re-export keeps both import paths valid.
 */

export {
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_THICKNESS_LEVEL,
  DOOR_WIDTH,
  DOOR_HEIGHT,
  CORRIDOR_WIDTH,
  type RoomType,
} from '../constants';
