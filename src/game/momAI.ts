/**
 * momAI.ts — Mother AI state machine (GDD §9, §12, §15).
 * States: SLEEP, FAKE SLEEP, PATROL, INVESTIGATE, SEARCH, CHASE, RETURN
 * plus the scripted FINALE behaviour of Act 3.
 *
 * Runs headless: a class updated each frame by <Mom/>. Reads/writes
 * `runtime`, pushes UI snapshots into the zustand store.
 */

import {
  DOORS,
  findPath,
  navNode,
  nearestNode,
  roomAt,
  roomDistance,
  type NavNode,
  type RoomId,
} from './house';
import { blockersBetween, emitNoise, onNoise, runtime, type NoiseEvent } from './runtime';
import { getHideSpot, getSpot, HIDE_SPOTS, PATROL_POINTS } from './spots';
import { useGameStore } from '../state/gameStore';
import { audioEngine } from '../systems/audio';
import {
  DETECT_DECAY_PER_SEC,
  DETECT_FLASHLIGHT_BONUS,
  DETECT_RUN_BONUS,
  DETECT_SIGHT_PER_SEC,
  DETECT_STILL_DIM_FACTOR,
  FINALE_MOM_EXIT_DELAY,
  BATHROOM_LOCK_DELAY,
  MOM_CATCH_DISTANCE,
  MOM_CHASE_GIVE_UP,
  MOM_CHASE_SPEED,
  MOM_DOORWAY_PAUSE_CHANCE,
  MOM_DOORWAY_PAUSE_MAX,
  MOM_DOORWAY_PAUSE_MIN,
  MOM_FAKE_SLEEP_CHANCE,
  MOM_FAKE_SLEEP_CHANCE_HARD,
  MOM_FAKE_SLEEP_MAX,
  MOM_HEAR_BASE_RANGE,
  MOM_INVESTIGATE_EXAMINE_MAX,
  MOM_INVESTIGATE_EXAMINE_MIN,
  MOM_INVESTIGATE_SPEED,
  MOM_LIGHT_SLEEP_MAX,
  MOM_LIGHT_SLEEP_MIN,
  MOM_PATROL_SPEED,
  MOM_RETURN_SPEED,
  MOM_SEARCH_DURATION_MAX,
  MOM_SEARCH_DURATION_MIN,
  MOM_SIGHT_TO_CHASE,
  MOM_VISION_ANGLE,
  MOM_VISION_RANGE_DARK,
  MOM_VISION_RANGE_DIM,
  MOM_VISION_RANGE_LIT,
  MOM_WAKE_THRESHOLD,
  MOM_WALL_ATTENUATION,
} from '../constants';
import { getRoom } from './house';

const BED_POS: [number, number] = [1.2, 5.5];

const CHASE_LINES = ['I knew it!', 'Where do you think you’re going?!', 'Get back here!'];
const SEARCH_LINES = [
  'I can hear you breathing…',
  'Come out. Right now.',
  'I know you’re up.',
];
const CATCH_LINES = [
  'We’ll talk in the morning.',
  'Two a.m. Really.',
  'Give. It. Back.',
];
const MUTTER_LINES = ['…kids these days…', '…I work in six hours…', '…unbelievable…'];

type FinaleStage =
  | 'none'
  | 'rising'
  | 'toPhone'
  | 'checking'
  | 'pickup'
  | 'toPlayerRoom'
  | 'lookIn'
  | 'toBed'
  | 'done';

interface HearingMul {
  [k: string]: number;
}
const HEARING_MUL: HearingMul = {
  sleep: 0.55,
  fakeSleep: 0.95,
  patrol: 1.0,
  investigate: 1.15,
  search: 1.25,
  chase: 1.0,
  return: 0.9,
  finale: 1.0,
};

export class MomAI {
  private unsubscribe: (() => void) | null = null;

  // movement
  private path: NavNode[] = [];
  private pathIdx = 0;
  private finalTarget: [number, number] | null = null;
  private strideAcc = 0;
  private pauseTimer = 0;

  // sleep
  private stirTimer = MOM_LIGHT_SLEEP_MIN + Math.random() * (MOM_LIGHT_SLEEP_MAX - MOM_LIGHT_SLEEP_MIN);
  private fakeSleepTimer = 0;

  // patrol
  private patrolQueue: string[] = [];

  // investigate
  private examineTimer = 0;
  private investigatePos: [number, number] | null = null;

  // search
  private searchTimer = 0;
  private searchSpots: string[] = [];
  private searchCheckTimer = 0;
  private voiceTimer = 0;

  // chase
  private loseSightTimer = 0;
  private lastSeen: [number, number] = [0, 0];
  private repathTimer = 0;

  // vision
  private losTimer = 0;

  // memory (hard mode)
  private heardRooms = new Map<RoomId, number>();
  private hideUsage = new Map<string, number>();

  // doors
  private doorWaitTimer = 0;

  // finale
  finaleStage: FinaleStage = 'none';
  private finaleTimer = 0;

  constructor() {
    runtime.momX = BED_POS[0];
    runtime.momZ = BED_POS[1];
    this.unsubscribe = onNoise((e) => this.hear(e));
  }

  dispose() {
    this.unsubscribe?.();
  }

  /** call when the player enters a hide spot (memory system) */
  noteHide(spotId: string) {
    this.hideUsage.set(spotId, (this.hideUsage.get(spotId) ?? 0) + 1);
  }

  private get store() {
    return useGameStore.getState();
  }

  private setState(s: typeof runtime.momState) {
    if (runtime.momState === s) return;
    const prev = runtime.momState;
    runtime.momState = s;
    this.store.setMomState(s);
    const normal = this.store.difficulty === 'normal';
    if (normal) {
      if ((prev === 'sleep' || prev === 'fakeSleep') && s !== 'sleep' && s !== 'fakeSleep') {
        this.store.notify('MOM IS AWAKE');
      }
      if (s === 'search') this.store.notify('MOM IS SEARCHING');
      if (s === 'sleep') this.store.notify('MOM WENT BACK TO SLEEP');
    }
    // audio orchestration
    audioEngine.setSnoring(s === 'sleep');
    audioEngine.setMusicLevel(
      s === 'chase' ? 3 : s === 'search' ? 2 : s === 'investigate' ? 1 : 0,
    );
  }

  private say(line: string, intensity = 0.6) {
    this.store.setSubtitle(`Mom: “${line}”`);
    audioEngine.murmur(intensity);
    setTimeout(() => {
      if (useGameStore.getState().subtitle === `Mom: “${line}”`) {
        useGameStore.getState().setSubtitle(null);
      }
    }, 2600);
  }

  // ── hearing ───────────────────────────────────────────────────────────────

  private hear(e: NoiseEvent) {
    if (this.store.difficulty === 'easy') return;
    if (this.store.gamePhase !== 'playing' && this.store.gamePhase !== 'phone') return;
    const dx = e.x - runtime.momX;
    const dz = e.z - runtime.momZ;
    const dist = Math.hypot(dx, dz);
    const walls = blockersBetween(runtime.momX, runtime.momZ, e.x, e.z);
    const wallMul = Math.pow(MOM_WALL_ATTENUATION, walls);
    const range = MOM_HEAR_BASE_RANGE * (0.5 + e.intensity) * (HEARING_MUL[runtime.momState] ?? 1);
    const falloff = Math.max(0, 1 - dist / Math.max(0.1, range));
    const loud = e.intensity * wallMul * falloff;
    if (loud <= 0.01) return;

    // memory (hard)
    if (this.store.difficulty === 'hard') {
      const r = roomAt(e.x, e.z);
      this.heardRooms.set(r, (this.heardRooms.get(r) ?? 0) + 1);
    }

    const st = runtime.momState;
    if (st === 'sleep') {
      if (loud > MOM_WAKE_THRESHOLD) {
        this.wakeUp([e.x, e.z]);
      }
    } else if (st === 'fakeSleep') {
      if (loud > 0.08) {
        // she rises silently — no notification sound change yet
        this.startInvestigate([e.x, e.z], true);
      }
    } else if (st === 'patrol' || st === 'return') {
      if (loud > 0.12) this.startInvestigate([e.x, e.z]);
    } else if (st === 'investigate') {
      if (loud > 0.1) {
        this.investigatePos = [e.x, e.z];
        this.goTo(e.x, e.z);
        this.examineTimer = 0;
      }
    } else if (st === 'search') {
      if (loud > 0.15) {
        this.goTo(e.x, e.z);
      }
    } else if (st === 'finale') {
      // during finale she is on rails, but a very loud noise pulls a glance
      if (loud > 0.5 && this.finaleStage === 'toPhone') {
        this.say('I can hear you!', 0.8);
      }
    }
  }

  private wakeUp(noisePos: [number, number] | null) {
    audioEngine.setSnoring(false);
    if (noisePos) this.startInvestigate(noisePos);
    else this.startPatrol();
  }

  // ── state entries ─────────────────────────────────────────────────────────

  private startPatrol() {
    this.setState('patrol');
    const pts = [...PATROL_POINTS];
    // hard mode: weight rooms she heard noise in
    if (this.store.difficulty === 'hard') {
      pts.sort((a, b) => {
        const ra = this.heardRooms.get(navNode(a.node).room) ?? 0;
        const rb = this.heardRooms.get(navNode(b.node).room) ?? 0;
        return rb - ra + (Math.random() - 0.5);
      });
    } else {
      pts.sort(() => Math.random() - 0.5);
    }
    const count = this.store.difficulty === 'hard' ? 5 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2);
    this.patrolQueue = pts.slice(0, count).map((p) => p.node);
    this.routeToNode(this.patrolQueue.shift()!);
  }

  private startInvestigate(pos: [number, number], silent = false) {
    this.setState('investigate');
    if (!silent && Math.random() < 0.4) this.say('…hm?', 0.3);
    this.investigatePos = pos;
    this.examineTimer = 0;
    this.goTo(pos[0], pos[1]);
  }

  private startSearch(origin: [number, number]) {
    this.setState('search');
    this.searchTimer =
      MOM_SEARCH_DURATION_MIN + Math.random() * (MOM_SEARCH_DURATION_MAX - MOM_SEARCH_DURATION_MIN);
    const originRoom = roomAt(origin[0], origin[1]);
    const candidates = HIDE_SPOTS.filter(
      (h) => roomDistance(h.room, originRoom) <= 2 && h.id !== 'h_mom_bed_under',
    );
    candidates.sort((a, b) => {
      // hard mode: check the player's favourite spots first
      if (this.store.difficulty === 'hard') {
        const ua = this.hideUsage.get(a.id) ?? 0;
        const ub = this.hideUsage.get(b.id) ?? 0;
        if (ua !== ub) return ub - ua;
      }
      return a.safety - b.safety; // least safe checked first
    });
    this.searchSpots = candidates.map((c) => c.id);
    this.voiceTimer = 2 + Math.random() * 3;
    this.nextSearchSpot();
  }

  private nextSearchSpot() {
    const id = this.searchSpots.shift();
    if (!id) {
      this.startReturn();
      return;
    }
    const h = getHideSpot(id);
    this.goTo(h.check[0], h.check[1]);
    this.searchCheckTimer = 0;
  }

  private startChase() {
    if (runtime.momState === 'chase') return;
    this.setState('chase');
    this.say(CHASE_LINES[Math.floor(Math.random() * CHASE_LINES.length)], 1);
    audioEngine.stinger();
    this.loseSightTimer = 0;
    this.repathTimer = 0;
    if (this.store.difficulty === 'normal') this.store.notify('RUN.');
  }

  private startReturn() {
    this.setState('return');
    if (Math.random() < 0.6) this.say(MUTTER_LINES[Math.floor(Math.random() * MUTTER_LINES.length)], 0.3);
    this.goTo(BED_POS[0], BED_POS[1]);
  }

  // ── movement helpers ──────────────────────────────────────────────────────

  private routeToNode(nodeId: string) {
    const from = nearestNode(runtime.momX, runtime.momZ);
    this.path = findPath(from.id, nodeId);
    this.pathIdx = 0;
    this.finalTarget = null;
  }

  private goTo(x: number, z: number) {
    const from = nearestNode(runtime.momX, runtime.momZ);
    const targetRoom = roomAt(x, z);
    const to = nearestNode(x, z, targetRoom !== 'outside' ? targetRoom : undefined);
    this.path = findPath(from.id, to.id);
    this.pathIdx = 0;
    this.finalTarget = [x, z];
  }

  private speed(): number {
    switch (runtime.momState) {
      case 'chase':
        return MOM_CHASE_SPEED;
      case 'investigate':
        return MOM_INVESTIGATE_SPEED;
      case 'return':
        return MOM_RETURN_SPEED;
      case 'finale':
        return this.finaleStage === 'toPhone' ? MOM_CHASE_SPEED * 0.8 : MOM_INVESTIGATE_SPEED;
      default:
        return MOM_PATROL_SPEED;
    }
  }

  /** advance along path; returns true when arrived at final destination */
  private move(dt: number): boolean {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return false;
    }
    if (this.doorWaitTimer > 0) {
      this.doorWaitTimer -= dt;
      if (this.doorWaitTimer <= 0) {
        runtime.doorLocked['d_bath'] = false;
        runtime.doorOpen['d_bath'] = 1;
        this.store.setBathroomLocked(false);
        audioEngine.doorCreak(7.75, 4);
        this.say('Open. The. Door.', 0.9);
      }
      return false;
    }

    let tx: number, tz: number;
    if (this.pathIdx < this.path.length) {
      const n = this.path[this.pathIdx];
      tx = n.x;
      tz = n.z;
    } else if (this.finalTarget) {
      tx = this.finalTarget[0];
      tz = this.finalTarget[1];
    } else {
      return true;
    }

    const dx = tx - runtime.momX;
    const dz = tz - runtime.momZ;
    const dist = Math.hypot(dx, dz);
    const sp = this.speed();
    if (dist < 0.12) {
      // node reached
      if (this.pathIdx < this.path.length) {
        const n = this.path[this.pathIdx];
        this.onNodeReached(n);
        this.pathIdx++;
        if (this.pathIdx >= this.path.length && !this.finalTarget) return true;
      } else {
        return true;
      }
      return false;
    }
    const step = Math.min(dist, sp * dt);
    runtime.momX += (dx / dist) * step;
    runtime.momZ += (dz / dist) * step;
    const targetYaw = Math.atan2(dx, -dz);
    // smooth turn
    let dy = targetYaw - runtime.momYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    runtime.momYaw += dy * Math.min(1, 8 * dt);

    // footsteps + broom taps
    this.strideAcc += step;
    const strideLen = runtime.momState === 'chase' ? 0.62 : 0.78;
    if (this.strideAcc >= strideLen) {
      this.strideAcc = 0;
      const broom = runtime.momState === 'patrol' || runtime.momState === 'return';
      audioEngine.momStep(broom, runtime.momState === 'chase');
    }
    runtime.momRoom = roomAt(runtime.momX, runtime.momZ);
    return false;
  }

  private onNodeReached(n: NavNode) {
    // open panel doors she passes through
    if (n.door) {
      const d = DOORS.find((d) => d.id === n.door);
      if (d && d.kind === 'door') {
        const open = runtime.doorOpen[d.id] ?? (d.startsOpen ? 1 : 0);
        if (runtime.doorLocked[d.id]) {
          // locked bathroom — buys the player time (GDD §6)
          this.say('…why is this locked?', 0.7);
          audioEngine.searchRustle(n.x, n.z, 1.2, 0.6);
          this.doorWaitTimer = BATHROOM_LOCK_DELAY;
          return;
        }
        if (open < 0.5) {
          runtime.doorOpen[d.id] = 1;
          audioEngine.doorCreak(n.x, n.z);
          emitNoise(n.x, n.z, 0.2, 'momDoor');
        }
      }
      // doorway pause (GDD §9 patrol)
      if (runtime.momState === 'patrol' && Math.random() < MOM_DOORWAY_PAUSE_CHANCE) {
        this.pauseTimer = MOM_DOORWAY_PAUSE_MIN + Math.random() * (MOM_DOORWAY_PAUSE_MAX - MOM_DOORWAY_PAUSE_MIN);
      }
    }
  }

  // ── vision ────────────────────────────────────────────────────────────────

  private visionRange(): number {
    const room = getRoom(runtime.playerRoom === 'outside' ? 'hallway' : runtime.playerRoom);
    if (runtime.flashlightOn) return MOM_VISION_RANGE_LIT;
    if (room.light === 'dark') return MOM_VISION_RANGE_DARK;
    return MOM_VISION_RANGE_DIM;
  }

  private canSeePlayer(): boolean {
    if (runtime.playerHidden) return false;
    const dx = runtime.playerX - runtime.momX;
    const dz = runtime.playerZ - runtime.momZ;
    const dist = Math.hypot(dx, dz);
    let range = this.visionRange();
    if (runtime.playerCrouching) range *= 0.8;
    if (dist > range) return false;
    const bearing = Math.atan2(dx, -dz);
    let da = bearing - runtime.momYaw;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) > MOM_VISION_ANGLE / 2 && dist > 1.0) return false;
    return blockersBetween(runtime.momX, runtime.momZ, runtime.playerX, runtime.playerZ) === 0;
  }

  // ── main update ───────────────────────────────────────────────────────────

  update(dt: number) {
    const store = this.store;
    if (store.difficulty === 'easy') {
      // Easy: practice run — Mom never wakes (GDD §17)
      runtime.momDetection = 0;
      return;
    }
    if (store.gamePhase !== 'playing' && store.gamePhase !== 'phone') return;

    const st = runtime.momState;
    const awake = st !== 'sleep' && st !== 'fakeSleep';
    const seen = awake && st !== 'finale' ? this.canSeePlayer() : st === 'finale' ? this.canSeePlayer() : false;

    // continuous-LOS chase trigger (GDD §9)
    if (seen && st !== 'chase') {
      this.losTimer += dt;
      runtime.momDetection = Math.min(
        100,
        runtime.momDetection +
          dt *
            (DETECT_SIGHT_PER_SEC *
              (!runtime.playerMoving && !runtime.flashlightOn ? DETECT_STILL_DIM_FACTOR : 1) +
              (runtime.playerSprinting ? DETECT_RUN_BONUS : 0) +
              (runtime.flashlightOn ? DETECT_FLASHLIGHT_BONUS : 0)),
      );
      if (this.losTimer >= MOM_SIGHT_TO_CHASE * (runtime.playerMoving ? 1 : 3) || runtime.momDetection >= 100) {
        if (st === 'finale') {
          // during the finale, seeing the kid out of bed = instant pursuit
          this.finaleStage = 'none';
          this.store.setFinale(false, 0);
          this.startChase();
        } else {
          this.startChase();
        }
      }
    } else if (st !== 'chase') {
      this.losTimer = 0;
      runtime.momDetection = Math.max(0, runtime.momDetection - DETECT_DECAY_PER_SEC * dt);
    }

    switch (runtime.momState) {
      case 'sleep': {
        this.stirTimer -= dt;
        if (this.stirTimer <= 0) {
          this.stirTimer =
            MOM_LIGHT_SLEEP_MIN + Math.random() * (MOM_LIGHT_SLEEP_MAX - MOM_LIGHT_SLEEP_MIN);
          // light-sleep event: she stirs; 25% of the time she gets up
          audioEngine.murmur(0.25);
          if (Math.random() < 0.25) {
            this.wakeUp(null);
          }
        }
        break;
      }
      case 'fakeSleep': {
        this.fakeSleepTimer -= dt;
        if (this.fakeSleepTimer <= 0) {
          this.setState('sleep');
        }
        break;
      }
      case 'patrol': {
        if (this.move(dt)) {
          if (this.patrolQueue.length > 0) {
            this.routeToNode(this.patrolQueue.shift()!);
          } else {
            this.startReturn();
          }
        }
        break;
      }
      case 'investigate': {
        if (this.move(dt)) {
          if (this.examineTimer === 0) {
            this.examineTimer =
              MOM_INVESTIGATE_EXAMINE_MIN +
              Math.random() * (MOM_INVESTIGATE_EXAMINE_MAX - MOM_INVESTIGATE_EXAMINE_MIN);
          }
          this.examineTimer -= dt;
          // look around while examining
          runtime.momYaw += Math.sin(runtime.clock * 0.9) * dt * 1.1;
          // evidence check: searched spots left open nearby → SEARCH
          if (this.investigatePos) {
            for (const id of runtime.openedSpots) {
              const s = getSpot(id);
              const d = Math.hypot(s.x - runtime.momX, s.z - runtime.momZ);
              if (d < 2.0) {
                this.say('…this was closed.', 0.7);
                this.startSearch([runtime.momX, runtime.momZ]);
                return;
              }
            }
          }
          if (this.examineTimer <= 0) {
            // found nothing → resume patrol
            this.startPatrol();
          }
        }
        break;
      }
      case 'search': {
        this.searchTimer -= dt;
        this.voiceTimer -= dt;
        if (this.voiceTimer <= 0) {
          this.voiceTimer = 6 + Math.random() * 5;
          this.say(SEARCH_LINES[Math.floor(Math.random() * SEARCH_LINES.length)], 0.7);
        }
        if (this.searchTimer <= 0) {
          this.startReturn();
          break;
        }
        if (this.move(dt)) {
          this.searchCheckTimer += dt;
          if (this.searchCheckTimer > 1.6) {
            // she checked this spot — was the player in it?
            const checkedId = this.currentCheckedSpot();
            if (checkedId && runtime.playerHidden && runtime.hideSpotId === checkedId) {
              store.catchPlayer('Found you.');
              return;
            }
            this.nextSearchSpot();
          }
        }
        break;
      }
      case 'chase': {
        const dist = Math.hypot(runtime.playerX - runtime.momX, runtime.playerZ - runtime.momZ);
        if (seen) {
          this.loseSightTimer = 0;
          this.lastSeen = [runtime.playerX, runtime.playerZ];
        } else {
          this.loseSightTimer += dt;
        }
        if (dist < MOM_CATCH_DISTANCE && seen) {
          store.catchPlayer(CATCH_LINES[Math.floor(Math.random() * CATCH_LINES.length)]);
          return;
        }
        if (runtime.playerHidden && this.loseSightTimer > 2.5) {
          // lost them while they slipped into a hiding spot → SEARCH
          this.startSearch(this.lastSeen);
          break;
        }
        if (this.loseSightTimer > MOM_CHASE_GIVE_UP) {
          this.startSearch(this.lastSeen);
          break;
        }
        // anticipate (GDD: she does not follow your exact path)
        this.repathTimer -= dt;
        if (this.repathTimer <= 0) {
          this.repathTimer = 0.5;
          const lead = seen ? 0.55 : 0;
          const tx = (seen ? runtime.playerX : this.lastSeen[0]) + runtime.playerVelX * lead;
          const tz = (seen ? runtime.playerZ : this.lastSeen[1]) + runtime.playerVelZ * lead;
          if (seen && dist < 3 && blockersBetween(runtime.momX, runtime.momZ, tx, tz) === 0) {
            this.path = [];
            this.pathIdx = 0;
            this.finalTarget = [runtime.playerX, runtime.playerZ];
          } else {
            this.goTo(tx, tz);
          }
        }
        this.move(dt);
        break;
      }
      case 'return': {
        if (this.move(dt)) {
          // back in bed — real sleep or fake sleep (GDD §9)
          const fakeChance =
            store.difficulty === 'hard' ? MOM_FAKE_SLEEP_CHANCE_HARD : MOM_FAKE_SLEEP_CHANCE;
          runtime.momX = BED_POS[0];
          runtime.momZ = BED_POS[1];
          if (Math.random() < fakeChance) {
            this.setState('fakeSleep');
            this.fakeSleepTimer = 8 + Math.random() * (MOM_FAKE_SLEEP_MAX - 8);
          } else {
            this.setState('sleep');
          }
        }
        break;
      }
      case 'finale': {
        this.updateFinale(dt);
        break;
      }
    }
  }

  private currentCheckedSpot(): string | null {
    // the spot whose check point we're standing at = the one just shifted
    let best: string | null = null;
    let bestD = Infinity;
    for (const h of HIDE_SPOTS) {
      const d = Math.hypot(h.check[0] - runtime.momX, h.check[1] - runtime.momZ);
      if (d < bestD) {
        bestD = d;
        best = h.id;
      }
    }
    return bestD < 1.2 ? best : null;
  }

  // ── finale (Act 3, GDD §15) ───────────────────────────────────────────────

  startFinale() {
    this.setState('finale');
    this.finaleStage = 'rising';
    this.finaleTimer = FINALE_MOM_EXIT_DELAY;
    audioEngine.setSnoring(false);
    audioEngine.setMusicLevel(3);
  }

  private updateFinale(dt: number) {
    const store = this.store;
    const phoneSpot = getSpot(store.phoneSpotId);
    switch (this.finaleStage) {
      case 'rising': {
        this.finaleTimer -= dt;
        if (this.finaleTimer <= 0) {
          this.finaleStage = 'toPhone';
          this.goTo(phoneSpot.x, phoneSpot.z);
          runtime.doorOpen['d_mom'] = 1; // she throws her door open
          audioEngine.doorCreak(5, 6.5);
          this.say('I know you’re up!', 1);
        }
        break;
      }
      case 'toPhone': {
        if (this.move(dt)) {
          this.finaleStage = 'checking';
          this.finaleTimer = 2.0;
        }
        break;
      }
      case 'checking': {
        this.finaleTimer -= dt;
        audioEngine.setMusicLevel(2);
        if (this.finaleTimer <= 0) {
          if (store.phoneReturned) {
            this.finaleStage = 'pickup';
            this.finaleTimer = 1.6;
            this.say(MUTTER_LINES[Math.floor(Math.random() * MUTTER_LINES.length)], 0.5);
            audioEngine.searchRustle(phoneSpot.x, phoneSpot.z, 1.4, 0.3);
          } else {
            // worst case — she KNOWS it's gone
            this.say('Where is it?!', 1);
            this.setState('search');
            this.searchTimer = MOM_SEARCH_DURATION_MAX;
            this.startSearch([phoneSpot.x, phoneSpot.z]);
            this.store.setFinale(false, 0);
          }
        }
        break;
      }
      case 'pickup': {
        this.finaleTimer -= dt;
        if (this.finaleTimer <= 0) {
          this.finaleStage = 'toPlayerRoom';
          this.store.setFinale(false, 0);
          this.goTo(11.2, 10.2); // just inside the kid's room
        }
        break;
      }
      case 'toPlayerRoom': {
        if (this.move(dt)) {
          this.finaleStage = 'lookIn';
          this.finaleTimer = 2.6;
        }
        break;
      }
      case 'lookIn': {
        this.finaleTimer -= dt;
        // she looks toward the bed
        const targetYaw = Math.atan2(13.8 - runtime.momX, -(10.5 - runtime.momZ));
        runtime.momYaw += (targetYaw - runtime.momYaw) * Math.min(1, 5 * dt);
        if (this.finaleTimer <= 0) {
          this.finaleStage = 'toBed';
          this.goTo(BED_POS[0], BED_POS[1]);
        }
        break;
      }
      case 'toBed': {
        if (this.move(dt)) {
          this.finaleStage = 'done';
          runtime.momX = BED_POS[0];
          runtime.momZ = BED_POS[1];
          this.setState('sleep');
          audioEngine.setMusicLevel(0);
        }
        break;
      }
      default:
        break;
    }
  }
}

/** module-level handle so the director / player systems can reach the AI */
export const momAIRef: { current: MomAI | null } = { current: null };
