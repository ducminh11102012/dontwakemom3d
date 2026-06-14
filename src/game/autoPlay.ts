/**
 * autoPlay.ts — AI bot that plays the game automatically.
 *
 * v2: Smooth, human-like movement — no more instant head snaps or
 * robotic pathing. Uses angular interpolation for camera, look-ahead
 * path following, subtle head sway, micro-pauses and glances.
 *
 * Strategy per ending:
 *   goodnight: find phone → reply → return phone → bed  (full run)
 *   coward:    find phone → skip reply → return phone → bed
 *   waiting:   find phone → reply → return phone → hide under Mom's bed → secret ending
 */

import type { InputState } from '../systems/useInput';
import { findPath, nearestNode, LEVEL_Y, type NavNode, DOORS } from './house';
import { runtime } from './runtime';
import { useGameStore } from '../state/gameStore';
import { HIDE_SPOTS, getSpot } from './spots';
import { playerLook } from '../systems/playerLook';

// ── Bot state machine ───────────────────────────────────────────────────────

type BotGoal =
  | 'findPhone'
  | 'replyPhone'
  | 'returnPhone'
  | 'goToBed'
  | 'goToMomBed'
  | 'hiding'
  | 'waitEnding'
  | 'searchForItems'
  | 'openDoor';

interface BotState {
  goal: BotGoal;
  prevGoal: BotGoal | null;      // for resuming after hiding
  path: NavNode[];
  pathIdx: number;
  targetSpot: string | null;
  waitTimer: number;
  interactCooldown: number;
  hideTimer: number;
  searchQueue: string[];
  spotsSearched: Set<string>;
  stuckTimer: number;
  stuckRecoveries: number;       // consecutive recoveries
  lastX: number;
  lastZ: number;
  phoneDone: boolean;
  replying: boolean;
  initialized: boolean;

  // ── smooth look ──
  desiredYaw: number;            // where we WANT to look
  yawVelocity: number;           // for spring damping
  // ── natural movement ──
  swayPhase: number;             // head sway oscillation
  glanceTimer: number;           // countdown to next random glance
  glanceYawOffset: number;       // current glance offset from desired yaw
  glanceFade: number;            // how quickly glance offset fades
  microPauseTimer: number;       // tiny hesitation at waypoints
  walkConfidence: number;        // 0..1 ramps up over time; affects turn speed
}

const state: BotState = {
  goal: 'findPhone',
  prevGoal: null,
  path: [],
  pathIdx: 0,
  targetSpot: null,
  waitTimer: 0,
  interactCooldown: 0,
  hideTimer: 0,
  searchQueue: [],
  spotsSearched: new Set(),
  stuckTimer: 0,
  stuckRecoveries: 0,
  lastX: 0,
  lastZ: 0,
  phoneDone: false,
  replying: false,
  initialized: false,

  desiredYaw: 0,
  yawVelocity: 0,
  swayPhase: 0,
  glanceTimer: 3 + Math.random() * 4,
  glanceYawOffset: 0,
  glanceFade: 0,
  microPauseTimer: 0,
  walkConfidence: 0,
};

/** Synthetic input state the bot writes to each frame */
export const botInput: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: true,
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

// ── Math helpers ────────────────────────────────────────────────────────────

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

/** Shortest signed angular difference, result in [-PI, PI] */
function angleDiff(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Angle from current position to a world point */
function angleToPoint(tx: number, tz: number): number {
  const dx = tx - runtime.playerX;
  const dz = tz - runtime.playerZ;
  return Math.atan2(-dx, -dz);
}

// ── Smooth look system ──────────────────────────────────────────────────────

/**
 * Critically-damped spring for yaw interpolation.
 * Produces smooth, natural turns that accelerate and decelerate.
 * `urgency` 0..1 controls how fast: 0 = lazy glance, 1 = whip around.
 */
function updateSmoothLook(dt: number, urgency: number) {
  // Spring parameters based on urgency
  // Low urgency (casual walk) → slow smooth turn
  // High urgency (danger / close interaction) → quick but still smooth
  const omega = 4.0 + urgency * 8.0;   // natural frequency: 4..12
  const zeta = 0.75 + urgency * 0.15;  // damping: 0.75..0.9 (slightly underdamped for life)

  // Add subtle head sway while moving (breathing / walk rhythm)
  let swayOffset = 0;
  if (runtime.playerMoving && !runtime.playerHidden) {
    state.swayPhase += dt * 2.8; // synced roughly to footstep rhythm
    swayOffset = Math.sin(state.swayPhase) * 0.012 + Math.sin(state.swayPhase * 0.37) * 0.006;
  }

  // Handle glance: random occasional look to the side
  if (state.glanceFade > 0) {
    state.glanceFade = Math.max(0, state.glanceFade - dt * 1.2);
  } else {
    state.glanceYawOffset *= Math.max(0, 1 - dt * 3);
  }

  const targetYaw = state.desiredYaw + swayOffset + state.glanceYawOffset * state.glanceFade;
  const err = angleDiff(playerLook.yaw, targetYaw);

  // Critically-damped spring: x'' = -2ζωx' - ω²x
  const accel = -2 * zeta * omega * state.yawVelocity - omega * omega * err;
  state.yawVelocity += accel * dt;

  // Clamp velocity to prevent insane spins
  const maxVel = 8.0; // rad/s — fast enough for danger, slow enough to look natural
  state.yawVelocity = Math.max(-maxVel, Math.min(maxVel, state.yawVelocity));

  playerLook.yaw += state.yawVelocity * dt;

  // Normalize yaw to [-PI, PI]
  while (playerLook.yaw > Math.PI) playerLook.yaw -= Math.PI * 2;
  while (playerLook.yaw < -Math.PI) playerLook.yaw += Math.PI * 2;

  // Subtle pitch breathing (humans never hold perfectly level)
  const breathPitch = Math.sin(state.swayPhase * 0.6) * 0.008;
  playerLook.pitch = breathPitch;
}

/** Set where we want to look (smooth — actual yaw follows via spring) */
function lookToward(tx: number, tz: number) {
  state.desiredYaw = angleToPoint(tx, tz);
}

/** Trigger a random glance to one side */
function triggerGlance() {
  const side = Math.random() > 0.5 ? 1 : -1;
  state.glanceYawOffset = side * (0.15 + Math.random() * 0.35); // 9°–29° glance
  state.glanceFade = 1.0;
}

// ── Navigation ──────────────────────────────────────────────────────────────

function buildSearchQueue(phoneSpotId: string): string[] {
  return [phoneSpotId];
}

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

function setNavTarget(tx: number, tz: number, ty = 0) {
  const from = nearestNode(runtime.playerX, runtime.playerZ, runtime.playerY);
  const to = nearestNode(tx, tz, ty);
  state.path = findPath(from.id, to.id);
  state.pathIdx = 0;
  state.walkConfidence = 0;
  // Skip first node if we're already past it
  if (state.path.length > 1) {
    const d0 = dist(runtime.playerX, runtime.playerZ, state.path[0].x, state.path[0].z);
    if (d0 < 1.0) state.pathIdx = 1;
  }
}

/**
 * Navigate along the current path with look-ahead.
 * Returns true if arrived at final destination.
 */
function followPath(dt: number): boolean {
  if (state.pathIdx >= state.path.length) return true;

  // Build walk confidence over time (affects how decisively we move)
  state.walkConfidence = Math.min(1, state.walkConfidence + dt * 0.8);

  const target = state.path[state.pathIdx];
  const d = dist(runtime.playerX, runtime.playerZ, target.x, target.z);

  // ── Door handling ──
  if (target.door) {
    const door = DOORS.find((dd) => dd.id === target.door);
    if (door) {
      const open = runtime.doorOpen[door.id] ?? (door.startsOpen ? 1 : 0);
      const locked = runtime.doorLocked[door.id] ?? false;
      if (open < 0.5 && !locked && d < 1.8) {
        lookToward(target.x, target.z);
        // Wait until we're mostly facing the door before interacting
        const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(target.x, target.z)));
        if (facingErr < 0.3 && state.interactCooldown <= 0) {
          botInput.interact = true;
          state.interactCooldown = 0.8;
        }
        // Slow down near the door, don't just charge through
        if (d > 0.7) {
          botInput.forward = true;
        }
        return false;
      }
    }
  }

  // ── Look-ahead: peek at the NEXT waypoint to start turning early ──
  const arrivalRadius = state.pathIdx < state.path.length - 1 ? 0.9 : 0.6;

  if (d < arrivalRadius) {
    state.pathIdx++;
    if (state.pathIdx >= state.path.length) return true;
    // Small micro-pause at waypoint corners for natural feel (not every time)
    const nextTarget = state.path[state.pathIdx];
    const turnAngle = Math.abs(angleDiff(
      angleToPoint(target.x, target.z),
      angleToPoint(nextTarget.x, nextTarget.z),
    ));
    // Only pause on significant turns (> ~45°)
    if (turnAngle > 0.75 && Math.random() < 0.4) {
      state.microPauseTimer = 0.08 + Math.random() * 0.15;
    }
    state.walkConfidence = Math.max(0.3, state.walkConfidence - 0.3);
    return false;
  }

  // ── Micro-pause (brief hesitation at corners) ──
  if (state.microPauseTimer > 0) {
    state.microPauseTimer -= dt;
    // Still look toward next target during the pause
    lookToward(target.x, target.z);
    return false;
  }

  // ── Look-ahead blending ──
  // If we're close to the current target and there's a next one, start
  // blending our look direction toward the next waypoint
  let lookX = target.x;
  let lookZ = target.z;
  if (state.pathIdx + 1 < state.path.length && d < 2.0) {
    const next = state.path[state.pathIdx + 1];
    const blend = 1 - d / 2.0; // 0 at 2m away, 1 at 0m
    const eased = blend * blend; // quadratic ease — subtle at first
    lookX = target.x + (next.x - target.x) * eased * 0.5;
    lookZ = target.z + (next.z - target.z) * eased * 0.5;
  }

  lookToward(lookX, lookZ);

  // Only start walking once we're roughly facing the right direction
  const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(target.x, target.z)));
  if (facingErr < 1.2) {
    botInput.forward = true;
    // Sprint if Mom is chasing and we're not too tired
    if (runtime.momState === 'chase') {
      botInput.crouch = false;
      botInput.sprint = true;
    }
  }
  // If we're way off (> ~100°), just turn in place first
  // This prevents the "walking sideways" look

  return false;
}

// ── Random glance system ────────────────────────────────────────────────────

function updateGlances(dt: number) {
  if (runtime.playerHidden) return;
  state.glanceTimer -= dt;
  if (state.glanceTimer <= 0) {
    // Only glance while walking, not during critical interactions
    if (runtime.playerMoving && state.goal !== 'hiding') {
      triggerGlance();
    }
    state.glanceTimer = 3 + Math.random() * 6;
  }
}

// ── Main update ─────────────────────────────────────────────────────────────

export function resetAutoPlay() {
  state.goal = 'findPhone';
  state.prevGoal = null;
  state.path = [];
  state.pathIdx = 0;
  state.targetSpot = null;
  state.waitTimer = 0;
  state.interactCooldown = 0;
  state.hideTimer = 0;
  state.searchQueue = [];
  state.spotsSearched = new Set();
  state.stuckTimer = 0;
  state.stuckRecoveries = 0;
  state.lastX = 0;
  state.lastZ = 0;
  state.phoneDone = false;
  state.replying = false;
  state.initialized = false;

  state.desiredYaw = playerLook.yaw;
  state.yawVelocity = 0;
  state.swayPhase = Math.random() * Math.PI * 2;
  state.glanceTimer = 3 + Math.random() * 4;
  state.glanceYawOffset = 0;
  state.glanceFade = 0;
  state.microPauseTimer = 0;
  state.walkConfidence = 0;
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

  // ── Compute look urgency based on situation ──
  let lookUrgency = 0.3; // default: casual
  if (runtime.momState === 'chase') lookUrgency = 0.9;
  else if (isMomDangerous()) lookUrgency = 0.6;
  else if (state.goal === 'hiding') lookUrgency = 0.5;
  else if (momDist() < 5) lookUrgency = 0.5;

  // Don't do anything during non-playing phases
  if (store.gamePhase === 'caught' || store.gamePhase === 'ending') {
    state.goal = 'waitEnding';
    store.setAutoPlayStatus('Game Over');
    updateSmoothLook(dt, 0.2);
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
    state.desiredYaw = playerLook.yaw;
    state.waitTimer = 1.5;
    store.setAutoPlayStatus('Analyzing the house...');
    updateSmoothLook(dt, 0.1);
    return;
  }

  if (state.waitTimer > 0) {
    updateSmoothLook(dt, lookUrgency * 0.5);
    return;
  }

  // ── Phone UI (Act 2) ──
  if (store.gamePhase === 'phone') {
    const ending = store.autoPlayEnding;
    if (ending === 'coward') {
      store.closePhone(false, null);
      store.setAutoPlayStatus('Skipping reply... (coward ending)');
    } else {
      store.closePhone(true, 'LMAO ok goodnight!!! 😂');
      store.setAutoPlayStatus('Replied to Mina!');
    }
    state.waitTimer = 1.0;
    return;
  }

  // ── Random glances for naturalness ──
  updateGlances(dt);

  // ── Danger check: hide if Mom is close and dangerous ──
  if (state.goal !== 'hiding' && state.goal !== 'waitEnding') {
    const md = momDist();
    if ((isMomDangerous() && md < 5) || (runtime.momState === 'chase' && md < 8)) {
      const hideSpot = findNearestHideSpot();
      if (hideSpot && dist(runtime.playerX, runtime.playerZ, hideSpot.x, hideSpot.z) < 3) {
        state.prevGoal = state.goal;
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
      if (state.hideTimer > 8 && momDist() > 6 && !isMomDangerous()) {
        botInput.interact = true;
        state.waitTimer = 0.8 + Math.random() * 0.5;
        store.setAutoPlayStatus('Coast is clear...');
        // Resume previous goal instead of resetting
        if (state.prevGoal && state.prevGoal !== 'hiding') {
          state.goal = state.prevGoal;
          state.prevGoal = null;
          state.path = [];
          state.targetSpot = null;
        } else {
          reEvaluateGoal(store);
        }
      }
      updateSmoothLook(dt, 0.15);
      return;
    }

    const arrived = followPath(dt);
    if (arrived && state.targetSpot) {
      const hs = HIDE_SPOTS.find((h) => h.id === state.targetSpot);
      if (hs) {
        const d = dist(runtime.playerX, runtime.playerZ, hs.x, hs.z);
        if (d < 1.5 && state.interactCooldown <= 0) {
          lookToward(hs.x, hs.z);
          const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(hs.x, hs.z)));
          if (facingErr < 0.4) {
            botInput.interact = true;
            state.interactCooldown = 1.0;
          }
        }
      }
    }
    updateSmoothLook(dt, 0.7);
    return;
  }

  // ── Main goal execution ──
  switch (state.goal) {
    case 'findPhone': {
      if (!store.hasPhone) {
        const spotId = store.phoneSpotId;
        const spot = getSpot(spotId);
        const spotY = (spot.level ?? 0) * LEVEL_Y;
        store.setAutoPlayStatus(`Sneaking to ${spot.label}...`);

        if (runtime.openedSpots.has(spotId)) {
          const d = dist(runtime.playerX, runtime.playerZ, spot.x, spot.z);
          if (d < 1.5) {
            lookToward(spot.x, spot.z);
            const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(spot.x, spot.z)));
            if (facingErr < 0.35 && state.interactCooldown <= 0) {
              botInput.interact = true;
              state.interactCooldown = 1.0;
            }
          } else {
            setNavTarget(spot.x, spot.z, spotY);
            followPath(dt);
          }
          break;
        }

        if (state.path.length === 0 || state.targetSpot !== spotId) {
          state.targetSpot = spotId;
          setNavTarget(spot.x, spot.z, spotY);
        }

        const arrived = followPath(dt);
        if (arrived) {
          const d = dist(runtime.playerX, runtime.playerZ, spot.x, spot.z);
          if (d < 1.5) {
            lookToward(spot.x, spot.z);
            const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(spot.x, spot.z)));
            if (facingErr < 0.35 && state.interactCooldown <= 0) {
              botInput.interact = true;
              state.interactCooldown = 3.0;
              store.setAutoPlayStatus(`Searching ${spot.label}...`);
            }
          }
        }
      } else {
        state.goal = 'replyPhone';
        state.path = [];
        state.targetSpot = null;
        store.setAutoPlayStatus('Got the phone!');
      }
      break;
    }

    case 'replyPhone': {
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
        if (d < 1.5) {
          lookToward(spot.x, spot.z);
          const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(spot.x, spot.z)));
          if (facingErr < 0.35 && state.interactCooldown <= 0) {
            botInput.interact = true;
            state.interactCooldown = 2.0;
          }
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
        if (d < 1.5) {
          lookToward(bedX, bedZ);
          const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(bedX, bedZ)));
          if (facingErr < 0.4 && state.interactCooldown <= 0) {
            botInput.interact = true;
            state.interactCooldown = 1.5;
          }
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
        if (d < 1.5) {
          lookToward(momBedX, momBedZ);
          const facingErr = Math.abs(angleDiff(playerLook.yaw, angleToPoint(momBedX, momBedZ)));
          if (facingErr < 0.4 && state.interactCooldown <= 0) {
            botInput.interact = true;
            state.interactCooldown = 1.5;
          }
        }
      }
      break;
    }

    case 'waitEnding': {
      break;
    }
  }

  // ── Stuck detection (improved) ──
  const moved = dist(runtime.playerX, runtime.playerZ, state.lastX, state.lastZ);
  const g = state.goal as string;
  if (moved < 0.05 && g !== 'hiding' && g !== 'waitEnding' && !runtime.playerHidden) {
    state.stuckTimer += dt;
    if (state.stuckTimer > 4) {
      state.stuckRecoveries++;
      // First recovery: just recalculate path
      if (state.stuckRecoveries <= 2) {
        state.path = [];
        state.targetSpot = null;
      } else {
        // Multiple stuck: try a small random movement
        const jitterAngle = Math.random() * Math.PI * 2;
        state.desiredYaw = jitterAngle;
        botInput.forward = true;
        botInput.crouch = false;
        state.path = [];
        state.targetSpot = null;
        state.stuckRecoveries = 0;
      }
      state.stuckTimer = 0;
    }
  } else {
    state.stuckTimer = 0;
    if (moved > 0.3) state.stuckRecoveries = 0;
  }
  state.lastX = runtime.playerX;
  state.lastZ = runtime.playerZ;

  // ── Always run smooth look at end of frame ──
  updateSmoothLook(dt, lookUrgency);
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
  state.walkConfidence = 0;
}
