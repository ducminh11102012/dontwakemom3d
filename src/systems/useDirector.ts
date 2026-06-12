/**
 * useDirector.ts — per-frame game director: stress system (GDD §5),
 * Act-3 phone buzz + finale, ending detection (GDD §16), audio orchestration.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  FINALE_COUNTDOWN,
  NOISE_PHONE_BUZZ,
  SECRET_WAIT_SECONDS,
  STRESS_DECAY_FAR_PER_SEC,
  STRESS_DECAY_HIDING_PER_SEC,
  STRESS_DECAY_OWN_ROOM_PER_SEC,
  STRESS_MOM_LOOKS_INSTANT,
  STRESS_MOM_NEAR_PER_SEC,
  STRESS_MOM_SAME_ROOM_PER_SEC,
  STRESS_PHONE_BUZZ_INSTANT,
  STRESS_SILENCE_PER_SEC,
  MOM_VISION_ANGLE,
} from '../constants';
import { roomDistance } from '../game/house';
import { emitNoise, hasLineOfSight, runtime } from '../game/runtime';
import { momAIRef } from '../game/momAI';
import { useGameStore } from '../state/gameStore';
import { audioEngine } from '../systems/audio';
import { playerLook } from '../systems/playerLook';

export function useDirector() {
  const stress = useRef(0);
  const lookCooldown = useRef(0);
  const heartNoise = useRef(0);
  const buzzDelay = useRef<number | null>(null);
  const buzzed = useRef(false);
  const bedTimer = useRef(0);
  const secretTimer = useRef(0);
  const secretArmed = useRef(false);
  const approachCooldown = useRef(0);
  const syncTimer = useRef(0);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const store = useGameStore.getState();
    const active = store.gamePhase === 'playing' || store.gamePhase === 'phone';

    // audio listener + engine clock always run while in a run
    audioEngine.setListener(camera.position.x, camera.position.y, camera.position.z, playerLook.yaw);
    audioEngine.update(dt);
    if (!active) return;

    const momAsleep =
      runtime.momState === 'sleep' ||
      runtime.momState === 'fakeSleep' ||
      runtime.momState === 'tranq';
    const easy = store.difficulty === 'easy';
    lookCooldown.current = Math.max(0, lookCooldown.current - dt);
    approachCooldown.current = Math.max(0, approachCooldown.current - dt);

    // ── stress (GDD §5) ─────────────────────────────────────────────────────
    if (!easy) {
      const rd =
        runtime.momRoom === 'outside' || runtime.playerRoom === 'outside'
          ? 3
          : roomDistance(runtime.momRoom, runtime.playerRoom);
      let delta = 0;
      if (!momAsleep && runtime.momState !== 'finale') {
        if (rd === 0) delta += STRESS_MOM_SAME_ROOM_PER_SEC;
        else if (rd <= 2) delta += STRESS_MOM_NEAR_PER_SEC;
      }
      if (runtime.momState === 'fakeSleep') delta += STRESS_SILENCE_PER_SEC;
      if (delta === 0) {
        if (runtime.playerHidden) delta = -STRESS_DECAY_HIDING_PER_SEC;
        else if (runtime.playerRoom === 'playerRoom') delta = -STRESS_DECAY_OWN_ROOM_PER_SEC;
        else delta = -STRESS_DECAY_FAR_PER_SEC;
      }
      // Mom looks toward the player (instant +50, throttled)
      if (!momAsleep && !runtime.playerHidden && lookCooldown.current <= 0) {
        const dx = runtime.playerX - runtime.momX;
        const dz = runtime.playerZ - runtime.momZ;
        let da = Math.atan2(dx, -dz) - runtime.momYaw;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (
          Math.abs(da) < MOM_VISION_ANGLE / 2 &&
          Math.hypot(dx, dz) < 9 &&
          hasLineOfSight(runtime.momX, runtime.momZ, runtime.playerX, runtime.playerZ)
        ) {
          stress.current = Math.min(100, stress.current + STRESS_MOM_LOOKS_INSTANT);
          lookCooldown.current = 6;
        }
      }
      stress.current = Math.max(0, Math.min(100, stress.current + delta * dt));

      // stress 100 → no timer death (Granny-style). Your pounding heart and
      // ragged breathing make NOISE — Mom physically walks over to check.
      // She can only catch you by actually reaching you.
      if (
        stress.current >= 100 &&
        !runtime.playerHidden &&
        runtime.momState !== 'chase' &&
        store.gamePhase === 'playing'
      ) {
        heartNoise.current -= dt;
        if (heartNoise.current <= 0) {
          heartNoise.current = 3.5;
          emitNoise(runtime.playerX, runtime.playerZ, 0.45, 'heartbeat');
        }
      } else {
        heartNoise.current = 0;
      }
    } else {
      stress.current = 0;
    }
    audioEngine.setStress(stress.current);
    runtime.stress = stress.current;

    // ── Act 3: delayed friend reply → BUZZ (GDD §15) ────────────────────────
    if (store.replySent && store.act === 3 && !buzzed.current) {
      if (buzzDelay.current === null) buzzDelay.current = 8 + Math.random() * 8;
      buzzDelay.current -= dt;
      if (buzzDelay.current <= 0 && store.gamePhase === 'playing') {
        buzzed.current = true;
        audioEngine.phoneBuzz();
        emitNoise(runtime.playerX, runtime.playerZ, NOISE_PHONE_BUZZ, 'buzz');
        stress.current = Math.min(100, stress.current + STRESS_PHONE_BUZZ_INSTANT);
        store.notify('Mina: “LMAOOO OK GOODNIGHT”');
        if (!easy) {
          momAIRef.current?.startFinale();
          store.setFinale(true, FINALE_COUNTDOWN);
          store.setObjective('PUT IT BACK. GET TO BED.');
        }
      }
    }
    if (store.finaleActive) {
      const t = Math.max(0, store.finaleTimer - dt);
      store.setFinale(true, t);
    }

    // ── approach warning (normal difficulty) ────────────────────────────────
    if (
      store.difficulty === 'normal' &&
      !momAsleep &&
      runtime.momState !== 'chase' &&
      approachCooldown.current <= 0 &&
      roomDistance(
        runtime.momRoom === 'outside' ? 'hallway' : runtime.momRoom,
        runtime.playerRoom === 'outside' ? 'hallway' : runtime.playerRoom,
      ) <= 1
    ) {
      approachCooldown.current = 12;
      store.notify('MOM IS APPROACHING');
    }

    // ── endings (GDD §16) ───────────────────────────────────────────────────
    const inOwnBed = store.isHiding && store.hideSpotId === 'h_player_bed_in';
    if (inOwnBed && store.phoneReturned && (momAsleep || easy)) {
      bedTimer.current += dt;
      if (bedTimer.current > 2.5) {
        store.finish(store.replySent ? 'goodnight' : 'coward');
      }
    } else {
      bedTimer.current = 0;
    }

    // secret ending — under Mom's bed after the finale (GDD §16)
    const underMomBed = store.isHiding && store.hideSpotId === 'h_mom_bed_under';
    const finaleDone = momAIRef.current?.finaleStage === 'done';
    if (underMomBed && finaleDone && store.phoneReturned && runtime.momState === 'sleep') {
      secretTimer.current += dt;
      if (!secretArmed.current && secretTimer.current >= SECRET_WAIT_SECONDS) {
        secretArmed.current = true;
        store.setSubtitle('Her breathing is slow now. Crawl out. Slowly.');
      } else if (secretTimer.current > 4 && secretTimer.current < 4.1) {
        store.setSubtitle('She’s right above you. Don’t. Move.');
      }
    } else if (secretArmed.current && !store.isHiding && runtime.momState === 'sleep') {
      store.setSubtitle(null);
      store.finish('waiting');
    } else if (!underMomBed && !secretArmed.current) {
      secretTimer.current = 0;
    }

    // ── sync UI store at 10 Hz ──────────────────────────────────────────────
    syncTimer.current -= dt;
    if (syncTimer.current <= 0) {
      syncTimer.current = 0.1;
      const rounded = Math.round(stress.current);
      if (rounded !== store.stress) store.setStress(rounded);
    }
  });
}
