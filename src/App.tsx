/**
 * App.tsx
 * -------
 * Application root. In Phase 0 this is a deliberately minimal placeholder
 * screen that proves the toolchain (Vite + React + TS, strict mode) and the
 * zustand store both work. Phase 1 replaces the placeholder with the R3F
 * <Canvas>, pointer-lock controls and the first test room.
 */

import { GAME_TITLE, GAME_VERSION } from './constants';
import { useGameStore } from './state/gameStore';
import './App.css';

export default function App() {
  // Smoke-test the store wiring (Phase 0 sanity check — pun intended).
  const gamePhase = useGameStore((s) => s.gamePhase);

  return (
    <div className="phase0-screen">
      <p className="phase0-floor">FLOOR 09</p>
      <h1 className="phase0-title">{GAME_TITLE}</h1>
      <p className="phase0-sub">
        the elevator is not coming back<span className="phase0-cursor">▌</span>
      </p>
      <p className="phase0-meta">
        build {GAME_VERSION} · phase 0 — project setup complete · state:{' '}
        {gamePhase}
      </p>
      {/* PHASE_1_TODO: replace this placeholder with the R3F <Canvas> scene. */}
    </div>
  );
}
