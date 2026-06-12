/**
 * App.tsx
 * -------
 * Application root (Phase 1): fullscreen R3F <Canvas> + the "Click to Play"
 * overlay that doubles as a temporary menu/pause screen until Phase 8.
 *
 * Flow:
 *  - gamePhase 'menu' / 'paused' → overlay visible, pointer unlocked.
 *  - Any click locks the pointer (PointerLockControls listens on document)
 *    → 'playing', overlay hidden.
 *  - Escape exits pointer lock natively → onUnlock → 'paused', overlay back.
 */

import { Canvas } from '@react-three/fiber';
import { GAME_TITLE } from './constants';
import { useGameStore } from './state/gameStore';
import Experience from './components/Experience';
import './App.css';

export default function App() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const showOverlay = gamePhase !== 'playing';

  return (
    <div className="app-root">
      <Canvas
        camera={{ fov: 75, near: 0.05, far: 60 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <Experience />
      </Canvas>

      {showOverlay && (
        <div className="lock-overlay">
          <p className="lock-floor">FLOOR 09</p>
          <h1 className="lock-title">{GAME_TITLE}</h1>
          <p className="lock-action">
            {gamePhase === 'paused' ? 'paused — click to resume' : 'click to play'}
          </p>
          <p className="lock-hint">
            WASD move · Shift sprint · Ctrl/C crouch · Esc pause
          </p>
        </div>
      )}
    </div>
  );
}
