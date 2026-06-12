/**
 * gameStore.ts — global zustand store: phase flow, acts, stress, inventory,
 * Mom state snapshots for UI, endings. Per-frame values live in game/runtime.ts.
 */

import { create } from 'zustand';
import type { MomStateId } from '../game/runtime';
import { rollPhoneSpot } from '../game/spots';
import { runtime } from '../game/runtime';
import { resetPlayerLook } from '../systems/playerLook';

export type GamePhase =
  | 'menu'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'phone' // reply UI open (Act 2)
  | 'caught'
  | 'ending';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Act = 1 | 2 | 3;
export type EndingId = 'goodnight' | 'coward' | 'caught' | 'waiting' | null;

export interface Notification {
  id: number;
  text: string;
}

interface GameState {
  gamePhase: GamePhase;
  difficulty: Difficulty;
  act: Act;
  runId: number; // bumped on every new run → remounts the scene

  // player
  stamina: number;
  isCrouching: boolean;
  isSprinting: boolean;
  isHiding: boolean;
  hideSpotId: string | null;
  hasFlashlight: boolean;
  flashlightOn: boolean;
  stress: number;

  // phone
  phoneSpotId: string;
  hasPhone: boolean;
  phoneReturned: boolean;
  replySent: boolean;
  repliedText: string | null;

  // mom (UI snapshot)
  momState: MomStateId;
  momAwakeEver: boolean;

  // finale
  finaleActive: boolean;
  finaleTimer: number;

  // panic
  panicTimer: number | null;

  // UI
  prompt: string | null;
  searchProgress: number | null; // 0..1 while searching
  subtitle: string | null;
  notifications: Notification[];
  objective: string;
  ending: EndingId;
  caughtLine: string;
  bathroomLocked: boolean;

  // actions
  setGamePhase: (p: GamePhase) => void;
  setDifficulty: (d: Difficulty) => void;
  startRun: () => void;
  beginPlay: () => void;
  setStamina: (v: number) => void;
  setIsCrouching: (v: boolean) => void;
  setIsSprinting: (v: boolean) => void;
  setHiding: (spotId: string | null) => void;
  setHasFlashlight: (v: boolean) => void;
  setFlashlightOn: (v: boolean) => void;
  setStress: (v: number) => void;
  setMomState: (s: MomStateId) => void;
  pickUpPhone: () => void;
  closePhone: (sent: boolean, text: string | null) => void;
  setPhoneReturned: (v: boolean) => void;
  setFinale: (active: boolean, timer: number) => void;
  setPanicTimer: (v: number | null) => void;
  setPrompt: (p: string | null) => void;
  setSearchProgress: (v: number | null) => void;
  setSubtitle: (s: string | null) => void;
  notify: (text: string) => void;
  setObjective: (o: string) => void;
  catchPlayer: (line: string) => void;
  finish: (e: EndingId) => void;
  setBathroomLocked: (v: boolean) => void;
}

let notifId = 0;

export const useGameStore = create<GameState>((set, get) => ({
  gamePhase: 'menu',
  difficulty: 'normal',
  act: 1,
  runId: 0,

  stamina: 100,
  isCrouching: false,
  isSprinting: false,
  isHiding: false,
  hideSpotId: null,
  hasFlashlight: false,
  flashlightOn: false,
  stress: 0,

  phoneSpotId: 'kitchen_fridge',
  hasPhone: false,
  phoneReturned: false,
  replySent: false,
  repliedText: null,

  momState: 'sleep',
  momAwakeEver: false,

  finaleActive: false,
  finaleTimer: 0,

  panicTimer: null,

  prompt: null,
  searchProgress: null,
  subtitle: null,
  notifications: [],
  objective: 'Find your phone. Don’t wake Mom.',
  ending: null,
  caughtLine: '',
  bathroomLocked: false,

  setGamePhase: (gamePhase) => set({ gamePhase }),
  setDifficulty: (difficulty) => set({ difficulty }),

  startRun: () => {
    runtime.reset();
    resetPlayerLook();
    return set((s) => ({
      runId: s.runId + 1,
      gamePhase: 'intro',
      act: 1,
      stamina: 100,
      isCrouching: false,
      isSprinting: false,
      isHiding: false,
      hideSpotId: null,
      hasFlashlight: false,
      flashlightOn: false,
      stress: 0,
      phoneSpotId: rollPhoneSpot(),
      hasPhone: false,
      phoneReturned: false,
      replySent: false,
      repliedText: null,
      momState: 'sleep',
      momAwakeEver: false,
      finaleActive: false,
      finaleTimer: 0,
      panicTimer: null,
      prompt: null,
      searchProgress: null,
      subtitle: null,
      notifications: [],
      objective: 'Find your phone. Don’t wake Mom.',
      ending: null,
      caughtLine: '',
      bathroomLocked: false,
    }));
  },

  beginPlay: () => set({ gamePhase: 'playing' }),

  setStamina: (stamina) => set({ stamina }),
  setIsCrouching: (isCrouching) => set({ isCrouching }),
  setIsSprinting: (isSprinting) => set({ isSprinting }),
  setHiding: (hideSpotId) => set({ isHiding: hideSpotId !== null, hideSpotId }),
  setHasFlashlight: (hasFlashlight) => set({ hasFlashlight }),
  setFlashlightOn: (flashlightOn) => set({ flashlightOn }),
  setStress: (stress) => set({ stress }),

  setMomState: (momState) =>
    set((s) => ({
      momState,
      momAwakeEver: s.momAwakeEver || (momState !== 'sleep' && momState !== 'fakeSleep'),
    })),

  pickUpPhone: () =>
    set({ hasPhone: true, act: 2, gamePhase: 'phone', objective: 'Reply… if you dare.' }),

  closePhone: (sent, text) => {
    if (sent) {
      set({
        replySent: true,
        repliedText: text,
        gamePhase: 'playing',
        act: 3,
        objective: 'PUT IT BACK. GET TO BED.',
      });
    } else {
      set({
        gamePhase: 'playing',
        objective: 'Put the phone back where you found it, then get to bed.',
      });
    }
  },

  setPhoneReturned: (phoneReturned) =>
    set((s) => ({
      phoneReturned,
      hasPhone: !phoneReturned,
      objective: phoneReturned
        ? 'Get to your bed. Pretend you were asleep.'
        : s.objective,
    })),

  setFinale: (finaleActive, finaleTimer) => set({ finaleActive, finaleTimer }),
  setPanicTimer: (panicTimer) => set({ panicTimer }),
  setPrompt: (prompt) => {
    if (get().prompt !== prompt) set({ prompt });
  },
  setSearchProgress: (searchProgress) => set({ searchProgress }),
  setSubtitle: (subtitle) => set({ subtitle }),

  notify: (text) => {
    const id = ++notifId;
    set((s) => ({ notifications: [...s.notifications.slice(-2), { id, text }] }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 3500);
  },

  setObjective: (objective) => set({ objective }),

  catchPlayer: (line) => {
    if (get().gamePhase === 'caught' || get().gamePhase === 'ending') return;
    set({ gamePhase: 'caught', caughtLine: line, ending: 'caught' });
  },

  finish: (ending) => {
    if (get().gamePhase === 'ending' || get().gamePhase === 'caught') return;
    set({ gamePhase: 'ending', ending });
  },

  setBathroomLocked: (bathroomLocked) => set({ bathroomLocked }),
}));
