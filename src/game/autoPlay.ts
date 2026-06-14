/**
 * autoPlay.ts — AI bot that plays the game automatically.
 *
 * The bot reads game state (runtime, store) and outputs synthetic input.
 * It uses the nav graph (findPath, nearestNode) for pathfinding and
 * mimics the real keyboard/mouse input expected by PlayerController.
 *
 * Strategy per ending:
 *   goodnight: find phone → reply → return phone → bed  (full run)
 *   coward:    find phone → skip reply → return phone → bed
 *   waiting:   find phone → reply → return phone → hide under Mom's bed → secret ending
 *
 * In all modes the bot also:
 * - Crouches by default (stealth)
 * - Hides when Mom is nearby
 * - Searches containers to find items
 * - Navigates through doors (opening closed ones)
 * - Uses the nav graph for pathfinding
 */

import type { InputState } from '../systems/useInput';
import { findPath, nearestNode, LEVEL_Y, type NavNode, DOORS } from './house';
import { runtime } from './runtime';
import { useGameStore } from '../state/gameStore';
import { HIDE_SPOTS, getSpot } from './spots';
import { playerLook } from '../systems/playerLook';

// ── Bot state machine ───────────────────────────────────────────────────────

type BotGoal =
  | 'findPhone'       // navigate to phone spot & search
  | 'replyPhone'      // Act 2: press through phone UI
  | 'returnPhone'     // bring phone back to its spot
  | 'goToBed'         // navigate to player bed & hide
  | 'goToMomBed'      // waiting ending: go under Mom's bed
  | 'hiding'          // currently hiding, wait for danger to pass
  | 'waitEnding'      // waiting for ending screen
  | 'searchForItems'  // searching containers along the way
  | 'openDoor';       // need to open a door

interface BotState {
  goal: BotGoal;
  path: NavNode[];        // current nav path
  pathIdx: number;        // which node we're walking toward
  targetSpot: string | null;    // spot id to interact with
  waitTimer: number;      // wait before doing something
  interactCooldown: number;
  lookTarget: { x: number; z: number } | null;
  hideTimer: number;      // how long we've been hiding
  searchQueue: string[];  // ordered list of spots to search
  spotsSearched: Set<string>;
  stuckTimer: number;     // detect stuck
  lastX: number;
  lastZ: number;
  phoneDone: boolean;
  replying: boolean;
  initialized: boolean;
}

const state: BotState = {
  goal: 'findPhone',
  path: [],
  pathIdx: 0,
  targetSpot: null,
  waitTimer: 0,
  interactCooldown: 0,
  lookTarget: null,
  hideTimer: 0,
  searchQueue: [],
  spotsSearched: new Set(),
  stuckTimer: 0,
  lastX: 0,
  lastZ: 0,
  phoneDone: false,
  replying: false,
  initialized: false,
};

/** Synthetic input state the bot writes to each frame */
export const botInput: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: true,    // default crouch for stealth
  interact: false,
  flashlight: false,
  holdBreath: false,
  peek: false,
  lock: false,
};

function resetBotInput() {
  botInput.forward = false;
  botInput.backward = false;
  botInput.left = false;
  botInput.right = false;
  botInput.sprint = false;
  botInput.crouch = true;
  botInput.interact = false;
  botInput.flashlight = false;
  botInput.holdBreath = false;
  botInput.peek = false;
  botInput.lock = false;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function dist(x1: number, z1: number, x2: number, z2: number): number {
  return Math.hypot(x2 - x1, z2 - z1);
}

function momDist(): number {
  return dist(runtime.playerX, runtime.playerZ, runtime.momX, runtime.momZ);
}

function isMomDangerous(): boolean {
  const ms = runtime.momState;
  return ms === 'chase' || ms === 'investigate' || ms === 'search';
}



/** Turn the camera to face a point (set yaw) */
function lookAt(tx: number, tz: number) {
  const dx = tx - runtime.playerX;
  const dz = tz - runtime.playerZ;
  playerLook.yaw = Math.atan2(-dx, -dz);
  playerLook.pitch = 0;
}

/** Build a search order: phone spot first, then nearby spots */
function buildSearchQueue(phoneSpotId: string): string[] {
  const q: string[] = [];
  // Phone spot first
  q.push(phoneSpotId);
  return q;
}

/** Find the nearest safe hide spot to the player */
function findNearestHideSpot(): typeof HIDE_SPOTS[number] | null {
  let best: typeof HIDE_SPOTS[number] | null = null;
  let bestD = Infinity;
  const lvl = runtime.playerLevel;
  for (const h of HIDE_SPOTS) {
    if ((h.level ?? 0) !== lvl) continue;
    const d = dist(runtime.playerX, runtime.playerZ, h.x, h.z);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

/** Set a nav path from current position to a world coordinate */
function setNavTarget(tx: number, tz: number, ty = 0) {
  const from = nearestNode(runtime.playerX, runtime.playerZ, runtime.playerY);
  const to = nearestNode(tx, tz, ty);
  state.path = findPath(from.id, to.id);
  state.pathIdx = 0;
  // Skip first node if we're already past it
  if (state.path.length > 1) {
    const d0 = dist(runtime.playerX, runtime.playerZ, state.path[0].x, state.path[0].z);
    if (d0 < 0.8) state.pathIdx = 1;
  }
}

/** Navigate along the current path. Returns true if arrived at destination. */
function followPath(_dt: number): boolean {
  if (state.pathIdx >= state.path.length) return true;

  const target = state.path[state.pathIdx];
  const d = dist(runtime.playerX, runtime.playerZ, target.x, target.z);

  // Check if we need to open a door at this node
  if (target.door) {
    const door = DOORS.find((dd) => dd.id === target.door);
    if (door) {
      const open = runtime.doorOpen[door.id] ?? (door.startsOpen ? 1 : 0);
      const locked = runtime.doorLocked[door.id] ?? false;
      if (open < 0.5 && !locked && d < 1.5) {
        // Face the door and interact
        lookAt(target.x, target.z);
        if (state.interactCooldown <= 0) {
          botInput.interact = true;
          state.interactCooldown = 0.8;
        }
        return false;
      }
    }
  }

  if (d < 0.6) {
    state.pathIdx++;
    if (state.pathIdx >= state.path.length) return true;
    return false;
  }

  // Face and walk toward target
  lookAt(target.x, target.z);
  botInput.forward = true;

  // Sprint if Mom is chasing and we're not too tired
  if (runtime.momState === 'chase') {
    botInput.crouch = false;
    botInput.sprint = true;
  }

  return false;
}

// ── Main update ─────────────────────────────────────────────────────────────

export function resetAutoPlay() {
  state.goal = 'findPhone';
  state.path = [];
  state.pathIdx = 0;
  state.targetSpot = null;
  state.waitTimer = 0;
  state.interactCooldown = 0;
  state.lookTarget = null;
  state.hideTimer = 0;
  state.searchQueue = [];
  state.spotsSearched = new Set();
  state.stuckTimer = 0;
  state.lastX = 0;
  state.lastZ = 0;
  state.phoneDone = false;
  state.replying = false;
  state.initialized = false;
}

/**
 * Called every frame when autoPlay is enabled.
 * Writes to botInput (read by PlayerController).
 */
export function updateAutoPlay(dt: number): void {
  const store = useGameStore.getState();
  resetBotInput();

  // Timers
  state.interactCooldown = Math.max(0, state.interactCooldown - dt);
  state.waitTimer = Math.max(0, state.waitTimer - dt);

  // Don't do anything during non-playing phases (except phone)
  if (store.gamePhase === 'caught' || store.gamePhase === 'ending') {
    state.goal = 'waitEnding';
    store.setAutoPlayStatus('Game Over');
    return;
  }

  if (store.gamePhase === 'menu' || store.gamePhase === 'intro' || store.gamePhase === 'paused') {
    return;
  }

  // Initialize on first playing frame
  if (!state.initialized && store.gamePhase === 'playing') {
    state.initialized = true;
    state.searchQueue = buildSearchQueue(store.phoneSpotId);
    state.lastX = runtime.playerX;
    state.lastZ = runtime.playerZ;
    state.waitTimer = 1.5; // brief pause before starting
    store.setAutoPlayStatus('Analyzing the house...');
    return;
  }

  if (state.waitTimer > 0) return;

  // ── Phone UI (Act 2) ──
  if (store.gamePhase === 'phone') {
    const ending = store.autoPlayEnding;
    if (ending === 'coward') {
      // Don't reply, just close
      store.closePhone(false, null);
      store.setAutoPlayStatus('Skipping reply... (coward ending)');
    } else {
      // Reply for goodnight or waiting ending
      store.closePhone(true, 'LMAO ok goodnight!!! 😂');
      store.setAutoPlayStatus('Replied to Mina!');
    }
    state.waitTimer = 1.0;
    return;
  }

  // ── Danger check: hide if Mom is close and dangerous ──
  if (state.goal !== 'hiding' && state.goal !== 'waitEnding') {
    const md = momDist();
    if ((isMomDangerous() && md < 5) || (runtime.momState === 'chase' && md < 8)) {
      const hideSpot = findNearestHideSpot();
      if (hideSpot && dist(runtime.playerX, runtime.playerZ, hideSpot.x, hideSpot.z) < 3) {
        state.goal = 'hiding';
        state.hideTimer = 0;
        setNavTarget(hideSpot.x, hideSpot.z, (hideSpot.level ?? 0) * LEVEL_Y);
        state.targetSpot = hideSpot.id;
        store.setAutoPlayStatus('⚠ HIDING — Mom is nearby!');
      }
    }
  }

  // ── Handle hiding ──
  if (state.goal === 'hiding') {
    if (runtime.playerHidden) {
      state.hideTimer += dt;
      // Wait for Mom to leave (at least 8s, and she must be far + not chasing)
      if (state.hideTimer > 8 && momDist() > 6 && !isMomDangerous()) {
        // Come out
        botInput.interact = true;
        state.goal = 'findPhone'; // re-evaluate goal
        state.waitTimer = 1.0;
        store.setAutoPlayStatus('Coast is clear...');
        reEvaluateGoal(store);
      }
      return;
    }

    // Navigate to the hide spot
    const arrived = followPath(dt);
    if (arrived && state.targetSpot) {
      const hs = HIDE_SPOTS.find((h) => h.id === state.targetSpot);
      if (hs) {
        const d = dist(runtime.playerX, runtime.playerZ, hs.x, hs.z);
        if (d < 1.5 && state.interactCooldown <= 0) {
          lookAt(hs.x, hs.z);
          botInput.interact = true;
          state.interactCooldown = 1.0;
        }
      }
    }
    return;
  }

  // ── Main goal execution ──
  switch (state.goal) {
    case 'findPhone': {
      // Navigate to phone spot and search it
      if (!store.hasPhone) {
        const spotId = store.phoneSpotId;
        const spot = getSpot(spotId);
        const spotY = (spot.level ?? 0) * LEVEL_Y;
        store.setAutoPlayStatus(`Sneaking to ${spot.label}...`);

        // Already opened? Take the phone
        if (runtime.openedSpots.has(spotId)) {
          const d = dist(runtime.playerX, runtime.playerZ, spot.x, spot.z);
          if (d < 1.5) {
            lookAt(spot.x, spot.z);
            if (state.interactCooldown <= 0) {
              botInput.interact = true;
              state.interactCooldown = 1.0;
            }
          } else {
            setNavTarget(spot.x, spot.z, spotY);
            followPath(dt);
          }
          break;
        }

        // Navigate to spot
        if (state.path.length === 0 || state.targetSpot !== spotId) {
          state.targetSpot = spotId;
          setNavTarget(spot.x, spot.z, spotY);
        }

        const arrived = followPath(dt);
        if (arrived) {
          const d = dist(runtime.playerX, runtime.playerZ, spot.x, spot.z);
          if (d < 1.5 && state.interactCooldown <= 0) {
            lookAt(spot.x, spot.z);
            botInput.interact = true;
            state.interactCooldown = 3.0; // wait for search animation
            store.setAutoPlayStatus(`Searching ${spot.label}...`);
          }
        }
      } else {
        // Phone found — the game will switch to phone phase
        state.goal = 'replyPhone';
        store.setAutoPlayStatus('Got the phone!');
      }
      break;
    }

    case 'replyPhone': {
      // Phone UI is handled above, wait for Act 3
      if (store.act === 3 || (store.act === 2 && store.hasPhone && !store.replySent && store.autoPlayEnding === 'coward')) {
        state.goal = 'returnPhone';
        state.targetSpot = null;
        state.path = [];
        state.waitTimer = 0.5;
      } else if (store.phoneReturned) {
        reEvaluateGoal(store);
      }
      break;
    }

    case 'returnPhone': {
      if (store.phoneReturned) {
        reEvaluateGoal(store);
        break;
      }

      const spotId = store.phoneSpotId;
      const spot = getSpot(spotId);
      const spotY = (spot.level ?? 0) * LEVEL_Y;
      store.setAutoPlayStatus(`Returning phone to ${spot.label}...`);

      if (state.path.length === 0 || state.targetSpot !== spotId) {
        state.targetSpot = spotId;
        setNavTarget(spot.x, spot.z, spotY);
      }

      const arrived = followPath(dt);
      if (arrived) {
        const d = dist(runtime.playerX, runtime.playerZ, spot.x, spot.z);
        if (d < 1.5 && state.interactCooldown <= 0) {
          lookAt(spot.x, spot.z);
          botInput.interact = true;
          state.interactCooldown = 2.0;
        }
      }
      break;
    }

    case 'goToBed': {
      store.setAutoPlayStatus('Sneaking back to bed...');
      const bedX = 13.4, bedZ = 10.6;

      if (runtime.playerHidden && store.hideSpotId === 'h_player_bed_in') {
        store.setAutoPlayStatus('In bed! Pretending to sleep...');
        state.goal = 'waitEnding';
        break;
      }

      if (state.path.length === 0 || state.targetSpot !== 'bed') {
        state.targetSpot = 'bed';
        setNavTarget(bedX, bedZ, 0);
      }

      const arrived = followPath(dt);
      if (arrived) {
        const d = dist(runtime.playerX, runtime.playerZ, bedX, bedZ);
        if (d < 1.5 && state.interactCooldown <= 0) {
          lookAt(bedX, bedZ);
          botInput.interact = true;
          state.interactCooldown = 1.5;
        }
      }
      break;
    }

    case 'goToMomBed': {
      store.setAutoPlayStatus('Sneaking to Mom\'s bed... (secret ending)');
      const momBedX = 1.6, momBedZ = 6.4;

      if (runtime.playerHidden && store.hideSpotId === 'h_mom_bed_under') {
        store.setAutoPlayStatus('Under Mom\'s bed... waiting...');
        state.goal = 'waitEnding';
        break;
      }

      if (state.path.length === 0 || state.targetSpot !== 'momBed') {
        state.targetSpot = 'momBed';
        setNavTarget(momBedX, momBedZ, 0);
      }

      const arrived = followPath(dt);
      if (arrived) {
        const d = dist(runtime.playerX, runtime.playerZ, momBedX, momBedZ);
        if (d < 1.5 && state.interactCooldown <= 0) {
          lookAt(momBedX, momBedZ);
          botInput.interact = true;
          state.interactCooldown = 1.5;
        }
      }
      break;
    }

    case 'waitEnding': {
      // Just wait
      break;
    }
  }

  // ── Stuck detection ──
  const moved = dist(runtime.playerX, runtime.playerZ, state.lastX, state.lastZ);
  const g = state.goal as string;
  if (moved < 0.05 && g !== 'hiding' && g !== 'waitEnding' && !runtime.playerHidden) {
    state.stuckTimer += dt;
    if (state.stuckTimer > 3) {
      // Try to unstick: recalculate path
      state.path = [];
      state.targetSpot = null;
      state.stuckTimer = 0;
    }
  } else {
    state.stuckTimer = 0;
  }
  state.lastX = runtime.playerX;
  state.lastZ = runtime.playerZ;
}

function reEvaluateGoal(store: ReturnType<typeof useGameStore.getState>) {
  const ending = store.autoPlayEnding;

  if (!store.hasPhone && !store.phoneReturned) {
    state.goal = 'findPhone';
  } else if (store.hasPhone && !store.phoneReturned) {
    state.goal = 'returnPhone';
  } else if (store.phoneReturned) {
    if (ending === 'waiting') {
      state.goal = 'goToMomBed';
    } else {
      state.goal = 'goToBed';
    }
  }
  state.path = [];
  state.targetSpot = null;
}
