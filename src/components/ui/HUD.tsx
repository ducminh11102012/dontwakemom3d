/**
 * HUD.tsx — diegetic-light HUD per GDD §18: objective, context prompt,
 * notifications, subtitles, search progress, finale countdown, panic flash,
 * stress vignette, crosshair, and the floor-plan map (difficulty-dependent).
 */

import { useEffect, useRef, useState } from 'react';
import { ROOMS } from '../../game/house';
import { runtime } from '../../game/runtime';
import { playerLook } from '../../systems/playerLook';
import { useGameStore } from '../../state/gameStore';

function MapOverlay() {
  const difficulty = useGameStore((s) => s.difficulty);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (difficulty === 'hard') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' || e.code === 'Tab') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [difficulty]);

  const visible =
    gamePhase === 'playing' && difficulty !== 'hard' && (difficulty === 'easy' || open);

  useEffect(() => {
    if (!visible) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const S = 12; // px per meter
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(8,10,18,0.82)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (const r of ROOMS) {
        ctx.strokeStyle = '#3d4566';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x0 * S + 4, r.z0 * S + 4, (r.x1 - r.x0) * S, (r.z1 - r.z0) * S);
        ctx.fillStyle = '#5a648c';
        ctx.font = '9px monospace';
        ctx.fillText(r.label.toUpperCase(), r.x0 * S + 8, r.z0 * S + 16);
      }
      // player
      const px = runtime.playerX * S + 4;
      const pz = runtime.playerZ * S + 4;
      ctx.fillStyle = '#7ec8ff';
      ctx.beginPath();
      ctx.arc(px, pz, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7ec8ff';
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.lineTo(px - Math.sin(playerLook.yaw) * 9, pz - Math.cos(playerLook.yaw) * 9);
      ctx.stroke();
      // mom (easy + normal)
      const awake = runtime.momState !== 'sleep';
      ctx.fillStyle = awake ? '#ff5a5a' : '#8a6a6a';
      ctx.beginPath();
      ctx.arc(runtime.momX * S + 4, runtime.momZ * S + 4, 4.5, 0, Math.PI * 2);
      ctx.fill();
    };
    draw();
    const id = setInterval(draw, 160);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="map-overlay">
      <canvas ref={canvasRef} width={15 * 12 + 8} height={13 * 12 + 8} />
      <div className="map-caption">M — close map</div>
    </div>
  );
}

export default function HUD() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const objective = useGameStore((s) => s.objective);
  const prompt = useGameStore((s) => s.prompt);
  const notifications = useGameStore((s) => s.notifications);
  const subtitle = useGameStore((s) => s.subtitle);
  const searchProgress = useGameStore((s) => s.searchProgress);
  const finaleActive = useGameStore((s) => s.finaleActive);
  const finaleTimer = useGameStore((s) => s.finaleTimer);
  const panicTimer = useGameStore((s) => s.panicTimer);
  const stress = useGameStore((s) => s.stress);
  const difficulty = useGameStore((s) => s.difficulty);
  const hasFlashlight = useGameStore((s) => s.hasFlashlight);

  if (gamePhase !== 'playing' && gamePhase !== 'phone') return null;

  const stressV = Math.min(1, stress / 100);

  return (
    <>
      {/* stress vignette + tremble */}
      <div
        className="stress-vignette"
        style={{ opacity: stressV * 0.85 }}
        data-panic={stress >= 100 || undefined}
      />
      <div className="hud">
        <div className="objective">
          <span className="objective-label">2:07 AM</span>
          {objective}
          {difficulty !== 'hard' && (
            <span className="hint-keys">
              {' '}
              · M map{hasFlashlight ? ' · F light' : ''}
            </span>
          )}
        </div>

        <div className="notifications">
          {notifications.map((n) => (
            <div key={n.id} className="notification">
              {n.text}
            </div>
          ))}
        </div>

        {finaleActive && finaleTimer > 0 && (
          <div className="finale-banner">
            PUT IT BACK. GET TO BED.
            <span className="finale-count">{finaleTimer.toFixed(1)}</span>
          </div>
        )}

        {panicTimer !== null && (
          <div className="panic-banner">
            HIDE. NOW. <span className="finale-count">{panicTimer.toFixed(1)}</span>
          </div>
        )}

        <div className="crosshair" />

        {searchProgress !== null && (
          <div className="search-bar">
            <div className="search-fill" style={{ width: `${searchProgress * 100}%` }} />
            <span>searching…</span>
          </div>
        )}

        {prompt && <div className="prompt">{prompt}</div>}
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>
      <MapOverlay />
    </>
  );
}
