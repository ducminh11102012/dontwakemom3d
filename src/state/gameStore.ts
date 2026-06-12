/**
 * gameStore.ts
 * ------------
 * Global zustand store — the single source of truth for ALL cross-system state
 * (section 0.6 of the project brief): game phase, sanity, inventory/objective
 * flags, Tenant AI state, settings/difficulty.
 *
 * Conventions:
 *  - Components read/write via the `useGameStore` hook. No prop drilling.
 *  - Per-frame values (player position, velocity...) stay in refs inside their
 *    systems; only push to this store when the UI must react.
 *  - AI / phase states are string literal unions, strictly typed.
 *
 * Phase 0 ships the typed skeleton only. Later phases extend it:
 *  - PHASE_4_TODO: sanity decay/regen actions + tier helpers
 *  - PHASE_5_TODO: Tenant state transitions driven by its state machine
 *  - PHASE_6_TODO: inventory/searchable-object integration, flashlight battery
 *  - PHASE_7_TODO: endings + restart flow
 *  - PHASE_8_TODO: difficulty modifiers table
 */

import { create } from 'zustand';
import { FLASHLIGHT_BATTERY_MAX, SANITY_START } from '../constants';

// ── State unions ────────────────────────────────────────────────────────────

/** High-level application phase. */
export type GamePhase = 'menu' | 'playing' | 'paused' | 'ending';

/** The Tenant's AI state machine states (implemented in Phase 5). */
export type TenantState = 'dormant' | 'patrol' | 'investigate' | 'hunt' | 'mimic';

/** Difficulty modes (implemented in Phase 8). */
export type Difficulty = 'easy' | 'normal' | 'hard';

/** How a run ended (implemented in Phase 7). */
export type EndingType = 'escaped' | 'caught' | 'secret' | null;

// ── Store shape ─────────────────────────────────────────────────────────────

export interface GameState {
  // Application flow
  gamePhase: GamePhase;
  difficulty: Difficulty;
  ending: EndingType;

  // Player condition
  sanity: number; // 0–100, see SANITY_* constants
  flashlightBattery: number; // 0–100 (Phase 6)
  isHidden: boolean; // player is inside a hiding spot (Phase 6)

  // Objectives
  hasPhone: boolean;
  hasBadge: boolean;

  // The Tenant
  tenantState: TenantState;

  // Actions
  setGamePhase: (phase: GamePhase) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setSanity: (sanity: number) => void;
  setTenantState: (state: TenantState) => void;
  resetRun: () => void;
}

// ── Initial values ──────────────────────────────────────────────────────────

const initialRunState = {
  ending: null as EndingType,
  sanity: SANITY_START,
  flashlightBattery: FLASHLIGHT_BATTERY_MAX,
  isHidden: false,
  hasPhone: false,
  hasBadge: false,
  tenantState: 'dormant' as TenantState,
};

// ── Store ───────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()((set) => ({
  gamePhase: 'menu',
  difficulty: 'normal',
  ...initialRunState,

  setGamePhase: (gamePhase) => set({ gamePhase }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setSanity: (sanity) => set({ sanity: Math.max(0, Math.min(100, sanity)) }),
  setTenantState: (tenantState) => set({ tenantState }),

  /** Reset everything that belongs to a single run (used by restart flow). */
  resetRun: () => set({ ...initialRunState }),
}));
