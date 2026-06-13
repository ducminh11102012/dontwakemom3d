/**
 * constants.ts — central tuning constants for DON'T WAKE MOM 3D.
 * All gameplay numbers from GDD v2 live here (scaled to meters/seconds).
 * GDD speed units: walk=100 → 2.2 m/s base scale.
 */

// ── Meta ────────────────────────────────────────────────────────────────────
export const GAME_TITLE = "DON'T WAKE MOM";
export const GAME_VERSION = '1.4.0';

// ── Player movement (GDD §4: walk 100 / crouch 60 / run 180) ───────────────
export const PLAYER_WALK_SPEED = 2.2; // m/s
export const PLAYER_CROUCH_SPEED = 1.32; // m/s (60%)
export const PLAYER_SPRINT_SPEED = 3.96; // m/s (180%)

// ── Player body ─────────────────────────────────────────────────────────────
export const PLAYER_RADIUS = 0.3;
export const PLAYER_HEIGHT = 1.65;
export const PLAYER_CROUCH_HEIGHT = 1.0;
export const PLAYER_CAMERA_OFFSET = 0.15;
export const PLAYER_CROUCH_TRANSITION_SPEED = 8;
export const PLAYER_CAPSULE_HALF_HEIGHT =
  (PLAYER_CROUCH_HEIGHT - 2 * PLAYER_RADIUS) / 2;
export const PLAYER_CAPSULE_HALF_TOTAL =
  PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_RADIUS;

// ── Stamina (GDD §4: drain 10/s, regen 15/s) ───────────────────────────────
export const STAMINA_MAX = 100;
export const STAMINA_DRAIN_PER_SECOND = 10;
export const STAMINA_REGEN_PER_SECOND = 15;
export const STAMINA_SPRINT_THRESHOLD = 8;
/** At 0 stamina: stumble slowdown + loud breathing (GDD §4). */
export const STUMBLE_DURATION = 2.0; // s of slowdown
export const STUMBLE_SPEED = 0.9; // m/s while stumbling
export const EXHAUSTED_BREATH_NOISE = 0.7; // GDD §12 stumble intensity
export const EXHAUSTED_BREATH_DURATION = 4.0; // s of unsuppressable breathing

// ── Mouse look ──────────────────────────────────────────────────────────────
export const MOUSE_SENSITIVITY = 0.0022;
export const PITCH_CLAMP = (85 * Math.PI) / 180;

// ── House geometry ──────────────────────────────────────────────────────────
export const WALL_HEIGHT = 2.6;
export const WALL_THICKNESS = 0.18;
export const DOOR_WIDTH = 1.1;
export const DOOR_HEIGHT = 2.1;

// ── Spawn: player bedroom, standing by the bed ─────────────────────────────
export const SPAWN_POSITION: [number, number] = [12.5, 11.8]; // x,z
export const SPAWN_YAW = 0.76; // facing the bedroom door (north-west into the room)

// ── Noise intensities (GDD §12 table) ───────────────────────────────────────
export const NOISE_CROUCH_CARPET = 0.05;
export const NOISE_CROUCH_WOOD = 0.15;
export const NOISE_CROUCH_TILE = 0.12;
export const NOISE_WALK_CARPET = 0.2;
export const NOISE_WALK_TILE = 0.4;
export const NOISE_WALK_WOOD = 0.45;
export const NOISE_RUN = 0.8;
export const NOISE_PHONE_BUZZ = 1.0;
export const NOISE_DOOR_CREAK = 0.45; // Mom's bedroom door, always creaks
export const NOISE_PEEK = 0.08;

/** Footstep interval (s) at walk speed; scaled by actual speed. */
export const FOOTSTEP_STRIDE = 0.72; // meters per step

// ── Stress system (GDD §5) ──────────────────────────────────────────────────
export const STRESS_MAX = 100;
export const STRESS_MOM_NEAR_PER_SEC = 15; // mom within ~3 rooms (dist tier)
export const STRESS_MOM_SAME_ROOM_PER_SEC = 30;
export const STRESS_MOM_LOOKS_INSTANT = 50;
export const STRESS_SILENCE_PER_SEC = 10; // fake-sleep silence
export const STRESS_PHONE_BUZZ_INSTANT = 60;
export const STRESS_DECAY_FAR_PER_SEC = 5;
export const STRESS_DECAY_HIDING_PER_SEC = 8;
export const STRESS_DECAY_OWN_ROOM_PER_SEC = 12;
export const HOLD_BREATH_RELIEF = 20;
export const HOLD_BREATH_ACTIVATION = 2.0; // s to activate
export const HOLD_BREATH_COOLDOWN = 15; // s
/** Distances (m) approximating "same room" / "within 3 rooms". */
export const STRESS_NEAR_DISTANCE = 9;

// ── Mom AI (GDD §9) ─────────────────────────────────────────────────────────
export const MOM_PATROL_SPEED = PLAYER_WALK_SPEED * 0.7;
export const MOM_INVESTIGATE_SPEED = PLAYER_WALK_SPEED * 0.9;
export const MOM_CHASE_SPEED = PLAYER_WALK_SPEED * 1.6;
export const MOM_RETURN_SPEED = PLAYER_WALK_SPEED * 0.65;
export const MOM_HEIGHT = 1.68;
export const MOM_CATCH_DISTANCE = 0.95;
export const MOM_INVESTIGATE_EXAMINE_MIN = 10;
export const MOM_INVESTIGATE_EXAMINE_MAX = 20;
export const MOM_SEARCH_DURATION_MIN = 20;
export const MOM_SEARCH_DURATION_MAX = 40;
export const MOM_CHASE_GIVE_UP = 15; // s after losing sight
export const MOM_SIGHT_TO_CHASE = 0.5; // s of continuous LOS
/** Granny-style pacing: she barely sleeps — gets up often and roams. */
export const MOM_LIGHT_SLEEP_MIN = 14; // random stir window
export const MOM_LIGHT_SLEEP_MAX = 32;
export const MOM_STIR_WAKE_CHANCE = 0.65; // chance a stir becomes a patrol
export const MOM_FIRST_WAKE_DELAY = 16; // s — first patrol is guaranteed early
export const MOM_PATROL_AGAIN_CHANCE = 0.55; // keep roaming instead of bed
export const MOM_FAKE_SLEEP_CHANCE = 0.2; // normal (hard: 0.35)
export const MOM_FAKE_SLEEP_CHANCE_HARD = 0.35;
export const MOM_FAKE_SLEEP_MAX = 30; // s motionless wait
export const MOM_DOORWAY_PAUSE_CHANCE = 0.35;
export const MOM_DOORWAY_PAUSE_MIN = 5;
export const MOM_DOORWAY_PAUSE_MAX = 10;
/** Sleep wake thresholds (noise intensity reaching her, attenuated). */
export const MOM_WAKE_THRESHOLD = 0.38;
export const MOM_HEAR_BASE_RANGE = 9; // m, scaled by intensity & walls
export const MOM_WALL_ATTENUATION = 0.38; // intensity multiplier per wall
/** Vision cone (GDD §12). */
export const MOM_VISION_ANGLE = (60 * Math.PI) / 180;
export const MOM_VISION_RANGE_DARK = 2.4;
export const MOM_VISION_RANGE_DIM = 4.5;
export const MOM_VISION_RANGE_LIT = 8.5;
/** Detection meter fill rates (GDD §12). */
export const DETECT_SIGHT_PER_SEC = 20;
export const DETECT_RUN_BONUS = 5;
export const DETECT_FLASHLIGHT_BONUS = 3;
export const DETECT_STILL_DIM_FACTOR = 0.3; // standing still in dim light
export const DETECT_DECAY_PER_SEC = 14;

// ── Acts / finale (GDD §14–15) ──────────────────────────────────────────────
export const REPLY_COUNTDOWN = 5.0;
export const FINALE_COUNTDOWN = 10.0;
export const FINALE_MOM_EXIT_DELAY = 4.0;
export const BATHROOM_LOCK_DELAY = 10.0; // buys 10 s

// ── Search durations multiplier per difficulty (GDD §8) ─────────────────────
export const SEARCH_TIME_FACTOR = { easy: 0.5, normal: 1.0, hard: 1.6 } as const;

// ── Secret ending (under Mom's bed wait) ────────────────────────────────────
export const SECRET_WAIT_SECONDS = 18; // she settles, then you crawl out

// ── Granny-style loop: key, safe, tranq gun ─────────────────────────────────
/** Safe (lockbox) in the storage room — holds the tranquilizer gun. */
export const SAFE_POS: [number, number, number] = [4.5, 0.42, 0.62];
export const TRANQ_RANGE = 12; // m
export const TRANQ_AIM_DOT = 0.992; // cos(~7°) aim tolerance
export const TRANQ_DURATION = 25; // s Mom stays knocked out
export const SAFE_WRONG_CODE_NOISE = 0.45; // the safe beeps angrily

// ── Caught jumpscare ─────────────────────────────────────────────────────────
export const JUMPSCARE_FACE_SECONDS = 3.0; // mom face on black, then…
export const JUMPSCARE_SCREAM_SECONDS = 5.5; // …scream in total darkness

// ── Performance ─────────────────────────────────────────────────────────────
export const TARGET_FPS = 60;
