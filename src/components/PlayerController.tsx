/**
 * PlayerController.tsx — FPS body + all player verbs (GDD §4, §8, §11, §13):
 * walk / crouch / sprint + stamina + stumble, footstep noise by floor type,
 * interact (search / hide / doors / lock / pickup / return), flashlight,
 * hold-breath, peek. Camera position follows the body (or the hide spot).
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import {
  EXHAUSTED_BREATH_DURATION,
  EXHAUSTED_BREATH_NOISE,
  FOOTSTEP_STRIDE,
  HOLD_BREATH_ACTIVATION,
  HOLD_BREATH_COOLDOWN,
  HOLD_BREATH_RELIEF,
  NOISE_CROUCH_CARPET,
  NOISE_CROUCH_TILE,
  NOISE_CROUCH_WOOD,
  NOISE_DOOR_CREAK,
  NOISE_PEEK,
  NOISE_RUN,
  NOISE_WALK_CARPET,
  NOISE_WALK_TILE,
  NOISE_WALK_WOOD,
  PLAYER_CAMERA_OFFSET,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_HALF_TOTAL,
  PLAYER_CROUCH_HEIGHT,
  PLAYER_CROUCH_SPEED,
  PLAYER_CROUCH_TRANSITION_SPEED,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPRINT_SPEED,
  PLAYER_WALK_SPEED,
  SEARCH_TIME_FACTOR,
  SPAWN_POSITION,
  STAMINA_DRAIN_PER_SECOND,
  STAMINA_MAX,
  STAMINA_REGEN_PER_SECOND,
  STAMINA_SPRINT_THRESHOLD,
  STUMBLE_DURATION,
  STUMBLE_SPEED,
  TRANQ_AIM_DOT,
  TRANQ_RANGE,
} from '../constants';
import { getRoom, roomAt } from '../game/house';
import { blockersBetween, emitNoise, runtime } from '../game/runtime';
import { findInteractable, FLASHLIGHT_POS } from '../game/interactions';
import { getHideSpot, SEARCH_CLASS_DATA, getSpot } from '../game/spots';
import { momAIRef } from '../game/momAI';
import { useGameStore } from '../state/gameStore';
import { useInput } from '../systems/useInput';
import { playerLook } from '../systems/playerLook';
import { audioEngine } from '../systems/audio';

const STAND_EYE = PLAYER_HEIGHT - PLAYER_CAMERA_OFFSET;
const CROUCH_EYE = PLAYER_CROUCH_HEIGHT - PLAYER_CAMERA_OFFSET;

const NOISE_TABLE: Record<string, Record<'carpet' | 'tile' | 'wood', number>> = {
  crouch: { carpet: NOISE_CROUCH_CARPET, tile: NOISE_CROUCH_TILE, wood: NOISE_CROUCH_WOOD },
  walk: { carpet: NOISE_WALK_CARPET, tile: NOISE_WALK_TILE, wood: NOISE_WALK_WOOD },
  run: { carpet: NOISE_RUN, tile: NOISE_RUN, wood: NOISE_RUN },
};

export default function PlayerController() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const inputRef = useInput();
  const flashRef = useRef<THREE.SpotLight>(null);
  const flashTargetRef = useRef<THREE.Object3D>(null);
  const flashMeshRef = useRef<THREE.Group>(null);

  const stamina = useRef(STAMINA_MAX);
  const sprinting = useRef(false);
  const eyeHeight = useRef(STAND_EYE);
  const stride = useRef(0);
  const prevInteract = useRef(false);
  const prevFlash = useRef(false);
  const prevPeek = useRef(false);
  const prevLock = useRef(false);
  const breathHold = useRef(0);
  const breathCooldown = useRef(0);
  const breathSoundTimer = useRef(0);
  const searching = useRef<{ id: string; t: number; dur: number; isReturn: boolean } | null>(null);
  const peekCooldown = useRef(0);
  const shootQueued = useRef(false);

  // tranq gun: left click while pointer-locked fires a dart
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || !document.pointerLockElement) return;
      shootQueued.current = true;
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleBreath = (
    held: boolean,
    dt: number,
    store: ReturnType<typeof useGameStore.getState>,
    allowed: boolean,
  ) => {
    if (held && allowed && breathCooldown.current <= 0) {
      breathHold.current += dt;
      runtime.holdingBreath = true;
      if (breathHold.current >= HOLD_BREATH_ACTIVATION) {
        breathHold.current = 0;
        breathCooldown.current = HOLD_BREATH_COOLDOWN;
        audioEngine.exhale();
        store.setStress(Math.max(0, store.stress - HOLD_BREATH_RELIEF));
        runtime.holdingBreath = false;
      }
    } else {
      breathHold.current = 0;
      runtime.holdingBreath = false;
    }
  };

  const handleInteract = (
    hit: NonNullable<ReturnType<typeof findInteractable>>,
    body: RapierRigidBody,
    store: ReturnType<typeof useGameStore.getState>,
  ) => {
    switch (hit.type) {
      case 'flashlight': {
        store.setHasFlashlight(true);
        store.notify('Flashlight taken. Press F.');
        audioEngine.uiBeep(620, 0.04);
        break;
      }
      case 'search': {
        const base = SEARCH_CLASS_DATA[hit.spot.cls];
        const dur = base.time * SEARCH_TIME_FACTOR[store.difficulty];
        searching.current = { id: hit.spot.id, t: 0, dur, isReturn: false };
        // Mom hears the search BEFORE it finishes (GDD §8)
        emitNoise(hit.spot.x, hit.spot.z, base.noise, 'search');
        audioEngine.searchRustle(hit.spot.x, hit.spot.z, dur, base.noise);
        break;
      }
      case 'return': {
        searching.current = { id: hit.spot.id, t: 0, dur: 1.0, isReturn: true };
        audioEngine.searchRustle(hit.spot.x, hit.spot.z, 1.0, 0.15);
        break;
      }
      case 'hide': {
        runtime.playerHidden = true;
        runtime.hideSpotId = hit.spot.id;
        store.setHiding(hit.spot.id);
        body.setEnabled(false);
        playerLook.yaw = hit.spot.camYaw;
        playerLook.pitch = 0;
        momAIRef.current?.noteHide(hit.spot.id);
        emitNoise(hit.spot.x, hit.spot.z, 0.12, 'hide');
        break;
      }
      case 'safe': {
        store.setKeypadOpen(true);
        audioEngine.uiBeep(540, 0.04);
        break;
      }
      case 'door': {
        const d = hit.door;
        if (runtime.doorLocked[d.id]) {
          if (hit.needsKey) {
            store.notify('Locked tight. There must be a key somewhere.');
            audioEngine.uiBeep(220, 0.07);
            break;
          }
          runtime.doorLocked[d.id] = false;
          if (d.id === 'd_bath') store.setBathroomLocked(false);
          store.notify(d.id === 'd_storage' ? 'The brass key fits. Click.' : 'Door unlocked.');
          audioEngine.uiBeep(620, 0.05);
          break;
        }
        const open = runtime.doorOpen[d.id] ?? (d.startsOpen ? 1 : 0);
        runtime.doorOpen[d.id] = open > 0.5 ? 0 : 1;
        const cx = d.axis === 'x' ? d.fixed : d.at;
        const cz = d.axis === 'x' ? d.at : d.fixed;
        if (d.creaks) {
          // Mom's door ALWAYS creaks (GDD §6)
          audioEngine.doorCreak(cx, cz);
          emitNoise(cx, cz, NOISE_DOOR_CREAK, 'creak');
        } else {
          audioEngine.searchRustle(cx, cz, 0.4, 0.2);
          emitNoise(cx, cz, 0.15, 'door');
        }
        break;
      }
    }
  };

  useFrame(({ camera }, delta) => {
    const body = bodyRef.current;
    if (!body) return;
    const dt = Math.min(delta, 1 / 20);
    const input = inputRef.current;
    const store = useGameStore.getState();
    const playing = store.gamePhase === 'playing';
    const now = performance.now() / 1000;

    breathCooldown.current = Math.max(0, breathCooldown.current - dt);
    peekCooldown.current = Math.max(0, peekCooldown.current - dt);

    // ── hidden mode ──────────────────────────────────────────────────────────
    if (runtime.playerHidden && store.hideSpotId) {
      const spot = getHideSpot(store.hideSpotId);
      camera.position.set(spot.cam[0], spot.cam[1], spot.cam[2]);
      runtime.playerX = spot.cam[0];
      runtime.playerZ = spot.cam[2];
      runtime.playerRoom = spot.room;
      runtime.playerMoving = false;
      runtime.playerVelX = 0;
      runtime.playerVelZ = 0;
      stamina.current = Math.min(STAMINA_MAX, stamina.current + STAMINA_REGEN_PER_SECOND * dt);

      if (playing) {
        // exit
        if (input.interact && !prevInteract.current) {
          body.setTranslation(
            { x: spot.exit[0], y: PLAYER_CAPSULE_HALF_TOTAL + 0.05, z: spot.exit[1] },
            true,
          );
          body.setEnabled(true);
          runtime.playerHidden = false;
          runtime.hideSpotId = null;
          store.setHiding(null);
          emitNoise(spot.exit[0], spot.exit[1], 0.12, 'unhide');
        }
        // peek (GDD §11)
        if (input.peek && !prevPeek.current && peekCooldown.current <= 0) {
          peekCooldown.current = 4;
          emitNoise(runtime.playerX, runtime.playerZ, NOISE_PEEK, 'peek');
          store.setSubtitle(peekHint(spot.camYaw));
          setTimeout(() => useGameStore.getState().setSubtitle(null), 2600);
        }
        handleBreath(input.holdBreath, dt, store, true);
        store.setPrompt('E — come out · Q — listen · B — hold breath');
      }
      prevInteract.current = input.interact;
      prevPeek.current = input.peek;
      pushStore(store);
      return;
    }

    // ── searching lock ───────────────────────────────────────────────────────
    if (searching.current && playing) {
      const s = searching.current;
      s.t += dt;
      store.setSearchProgress(Math.min(1, s.t / s.dur));
      body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
      if (s.t >= s.dur) {
        store.setSearchProgress(null);
        const spot = getSpot(s.id);
        if (s.isReturn) {
          store.setPhoneReturned(true);
          emitNoise(spot.x, spot.z, 0.15, 'return');
          store.notify('You put the phone back.');
        } else {
          runtime.openedSpots.add(s.id);
          if (s.id === store.phoneSpotId) {
            audioEngine.uiBeep(900, 0.07);
            store.pickUpPhone();
          } else {
            // Granny loop: keys, notes and darts hide in the clutter
            let found = false;
            if (s.id === store.keySpotId && !store.hasStorageKey) {
              store.findKey();
              store.notify('A small brass key. The storage room…');
              audioEngine.uiBeep(780, 0.06);
              found = true;
            }
            if (s.id === store.noteSpotId && !store.knowsCode) {
              store.findNote();
              store.notify(`A crumpled note: “safe — ${store.safeCode}”`);
              audioEngine.uiBeep(700, 0.06);
              found = true;
            }
            if (s.id === store.dartSpotId) {
              store.findDart();
              store.notify('A tranquilizer dart. Why does Mom own these?');
              audioEngine.uiBeep(660, 0.06);
              found = true;
            }
            if (!found) store.notify('Nothing here…');
          }
        }
        searching.current = null;
      }
      pushStore(store);
      return;
    }
    if (!playing && searching.current) {
      // phone UI opened mid-search etc.
      searching.current = null;
      store.setSearchProgress(null);
    }

    // ── stance & sprint ──────────────────────────────────────────────────────
    const crouching = playing && input.crouch;
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const isMoving = playing && (moveX !== 0 || moveZ !== 0);
    const stumbling = now < runtime.stumbleUntil;

    let isSprinting = sprinting.current;
    const wantsSprint = playing && input.sprint && isMoving && !crouching && !stumbling;
    if (!wantsSprint) isSprinting = false;
    else if (!isSprinting) isSprinting = stamina.current > STAMINA_SPRINT_THRESHOLD;

    if (isSprinting) {
      stamina.current = Math.max(0, stamina.current - STAMINA_DRAIN_PER_SECOND * dt);
      if (stamina.current <= 0) {
        isSprinting = false;
        // GDD §4: stumble + loud unsuppressable breathing
        runtime.stumbleUntil = now + STUMBLE_DURATION;
        runtime.exhaustedBreathUntil = now + EXHAUSTED_BREATH_DURATION;
      }
    } else {
      stamina.current = Math.min(STAMINA_MAX, stamina.current + STAMINA_REGEN_PER_SECOND * dt);
    }
    sprinting.current = isSprinting;

    // exhausted breathing wakes the house (GDD §4)
    if (now < runtime.exhaustedBreathUntil) {
      breathSoundTimer.current -= dt;
      if (breathSoundTimer.current <= 0) {
        breathSoundTimer.current = 1.0;
        audioEngine.heavyBreath();
        emitNoise(runtime.playerX, runtime.playerZ, EXHAUSTED_BREATH_NOISE, 'breathing');
      }
    }

    // ── velocity ─────────────────────────────────────────────────────────────
    const speed = stumbling
      ? STUMBLE_SPEED
      : crouching
        ? PLAYER_CROUCH_SPEED
        : isSprinting
          ? PLAYER_SPRINT_SPEED
          : PLAYER_WALK_SPEED;

    const vel = body.linvel();
    let vx = 0;
    let vz = 0;
    if (isMoving) {
      const yaw = playerLook.yaw;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      let dx = -sin * moveZ + cos * moveX;
      let dz = -cos * moveZ - sin * moveX;
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      vx = dx * speed;
      vz = dz * speed;
    }
    body.setLinvel({ x: vx, y: vel.y, z: vz }, true);

    // ── footsteps + noise footprint (GDD §4/§12) ────────────────────────────
    const pos = body.translation();
    const movedDist = Math.hypot(pos.x - runtime.playerX, pos.z - runtime.playerZ);
    runtime.playerVelX = vx;
    runtime.playerVelZ = vz;
    runtime.playerX = pos.x;
    runtime.playerZ = pos.z;
    runtime.playerRoom = roomAt(pos.x, pos.z);
    runtime.playerMoving = isMoving;
    runtime.playerCrouching = crouching;
    runtime.playerSprinting = isSprinting;

    if (isMoving) {
      stride.current += movedDist;
      const strideLen = isSprinting ? FOOTSTEP_STRIDE * 1.25 : FOOTSTEP_STRIDE;
      if (stride.current >= strideLen) {
        stride.current = 0;
        const room = getRoom(runtime.playerRoom === 'outside' ? 'hallway' : runtime.playerRoom);
        const mode = isSprinting ? 'run' : crouching ? 'crouch' : 'walk';
        const intensity = NOISE_TABLE[mode][room.floor];
        audioEngine.footstep(room.floor, mode === 'run' ? 1 : mode === 'walk' ? 0.6 : 0.3);
        emitNoise(pos.x, pos.z, intensity, 'footstep');
      }
    }

    // ── camera ───────────────────────────────────────────────────────────────
    const targetEye = crouching ? CROUCH_EYE : STAND_EYE;
    eyeHeight.current += (targetEye - eyeHeight.current) * Math.min(1, PLAYER_CROUCH_TRANSITION_SPEED * dt);
    const feetY = pos.y - PLAYER_CAPSULE_HALF_TOTAL;
    camera.position.set(pos.x, feetY + eyeHeight.current, pos.z);

    // ── tranq gun ────────────────────────────────────────────────────────────
    const wantShoot = shootQueued.current;
    shootQueued.current = false;
    if (playing && !store.keypadOpen && wantShoot && store.hasTranqGun) {
      if (store.darts <= 0) {
        store.notify('Out of darts.');
        audioEngine.uiBeep(200, 0.08);
      } else {
        store.useDart();
        audioEngine.uiBeep(170, 0.1); // soft pneumatic pfft
        emitNoise(runtime.playerX, runtime.playerZ, 0.22, 'dart');
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const toMom = new THREE.Vector3(
          runtime.momX - camera.position.x,
          1.1 - camera.position.y,
          runtime.momZ - camera.position.z,
        );
        const dist = Math.hypot(toMom.x, toMom.z);
        toMom.normalize();
        const aimed = dir.dot(toMom) > (dist < 2.5 ? 0.9 : TRANQ_AIM_DOT);
        const clear =
          blockersBetween(runtime.playerX, runtime.playerZ, runtime.momX, runtime.momZ) === 0;
        if (aimed && clear && dist <= TRANQ_RANGE) {
          momAIRef.current?.tranquilize();
        } else {
          store.notify('The dart whiffs into the dark…');
        }
      }
    }

    // ── interactions ─────────────────────────────────────────────────────────
    if (playing && !store.keypadOpen) {
      const hit = findInteractable(playerLook.yaw);
      let prompt: string | null = null;
      if (hit) {
        prompt = `E — ${hit.label}`;
        if (hit.type === 'door' && hit.lockHint) prompt += ' · R — lock';
      }
      if (breathCooldown.current <= 0 && (!isMoving || crouching) && !hit) {
        // surface the mechanic without cluttering every frame
      }
      store.setPrompt(prompt);

      if (input.interact && !prevInteract.current && hit) {
        handleInteract(hit, body, store);
      }
      if (input.lock && !prevLock.current && hit?.type === 'door' && hit.door.lockable) {
        const open = runtime.doorOpen[hit.door.id] ?? 0;
        if (open <= 0.5 && runtime.playerRoom === 'bathroom') {
          const locked = !(runtime.doorLocked[hit.door.id] ?? false);
          runtime.doorLocked[hit.door.id] = locked;
          store.setBathroomLocked(locked);
          audioEngine.uiBeep(locked ? 320 : 420, 0.04);
          store.notify(locked ? 'Door locked.' : 'Door unlocked.');
        }
      }

      // flashlight toggle (GDD §13)
      if (input.flashlight && !prevFlash.current && store.hasFlashlight) {
        const on = !store.flashlightOn;
        store.setFlashlightOn(on);
        runtime.flashlightOn = on;
        audioEngine.uiBeep(on ? 740 : 520, 0.035);
      }

      handleBreath(input.holdBreath, dt, store, !isMoving);
    } else if (store.keypadOpen) {
      store.setPrompt('type the 4-digit code · ESC — step away');
    }

    prevInteract.current = input.interact;
    prevFlash.current = input.flashlight;
    prevPeek.current = input.peek;
    prevLock.current = input.lock;

    // ── flashlight light follows camera ─────────────────────────────────────
    const fl = flashRef.current;
    const ft = flashTargetRef.current;
    if (fl && ft) {
      fl.visible = runtime.flashlightOn;
      fl.position.copy(camera.position);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      ft.position.copy(camera.position).add(dir.multiplyScalar(6));
      fl.target = ft;
    }
    if (flashMeshRef.current) {
      flashMeshRef.current.visible = !useGameStore.getState().hasFlashlight;
    }

    pushStore(store);

    function pushStore(s: typeof store) {
      const rounded = Math.round(stamina.current * 10) / 10;
      if (rounded !== s.stamina) s.setStamina(rounded);
      if (crouchedNow() !== s.isCrouching) s.setIsCrouching(crouchedNow());
      if (sprinting.current !== s.isSprinting) s.setIsSprinting(sprinting.current);
    }
    function crouchedNow() {
      return runtime.playerCrouching;
    }
  });

  return (
    <>
      <RigidBody
        ref={bodyRef}
        colliders={false}
        userData={{ isPlayer: true }}
        position={[SPAWN_POSITION[0], PLAYER_CAPSULE_HALF_TOTAL + 0.05, SPAWN_POSITION[1]]}
        enabledRotations={[false, false, false]}
        linearDamping={0.5}
        ccd
      >
        <CapsuleCollider args={[PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_RADIUS]} friction={0} />
      </RigidBody>
      {/* flashlight beam */}
      <spotLight
        ref={flashRef}
        visible={false}
        intensity={26}
        angle={0.5}
        penumbra={0.55}
        distance={14}
        decay={1.6}
        color="#ffeebb"
      />
      <object3D ref={flashTargetRef} />
      {/* flashlight pickup on the desk */}
      <group ref={flashMeshRef} position={FLASHLIGHT_POS}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.045, 0.22, 10]} />
          <meshStandardMaterial color="#8a2f2f" roughness={0.5} metalness={0.3} />
        </mesh>
        <pointLight intensity={0.25} distance={1.2} color="#ffd9a0" />
      </group>
    </>
  );
}

function peekHint(camYaw: number): string {
  const dx = runtime.momX - runtime.playerX;
  const dz = runtime.momZ - runtime.playerZ;
  const dist = Math.hypot(dx, dz);
  const st = runtime.momState;
  if (st === 'sleep') return 'You hear soft, steady snoring in the distance.';
  if (st === 'fakeSleep') return 'Silence. Total silence. That can’t be good.';
  if (st === 'tranq') return 'Nothing. She’s still out cold. For now.';
  const bearing = Math.atan2(dx, -dz) - camYaw;
  const s = Math.sin(bearing);
  const c = Math.cos(bearing);
  let dir: string;
  if (c > 0.5) dir = 'ahead of you';
  else if (c < -0.5) dir = 'behind you';
  else dir = s > 0 ? 'to your right' : 'to your left';
  const range = dist < 4 ? 'Very close.' : dist < 8 ? 'Not far.' : 'Far away.';
  const what = st === 'patrol' || st === 'return' ? 'slow taps' : 'footsteps';
  return `You hear ${what} ${dir}. ${range}`;
}
