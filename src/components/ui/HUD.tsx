/**
 * HUD.tsx — diegetic-light HUD per GDD §18: objective, context prompt,
 * notifications, subtitles, search progress, finale banner, panic flash,
 * stress vignette, crosshair, and the floor-plan map (difficulty-dependent).
 */

import { useEffect, useRef, useState } from 'react';
import { ROOMS } from '../../game/house';
import { emitNoise, runtime } from '../../game/runtime';
import { getSpot } from '../../game/spots';
import { playerLook } from '../../systems/playerLook';
import { useGameStore } from '../../state/gameStore';
import { audioEngine } from '../../systems/audio';
import { SAFE_POS, SAFE_WRONG_CODE_NOISE } from '../../constants';
import CCTVOverlay from './CCTVOverlay';

/** Safe keypad — type the 4-digit code (kbd only; the pointer stays locked). */
function Keypad() {
  const keypadOpen = useGameStore((s) => s.keypadOpen);
  if (!keypadOpen) return null;
  return <KeypadPanel />;
}

function KeypadPanel() {
  const [entry, setEntry] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useGameStore.getState();
      if (e.code === 'Escape' || e.code === 'KeyE') {
        store.setKeypadOpen(false);
        return;
      }
      if (e.code === 'Backspace') {
        setEntry((v) => v.slice(0, -1));
        return;
      }
      const m = e.code.match(/^(?:Digit|Numpad)(\d)$/);
      if (!m) return;
      e.preventDefault();
      audioEngine.uiBeep(620 + Number(m[1]) * 18, 0.03);
      setEntry((v) => {
        const next = (v + m[1]).slice(0, 4);
        if (next.length === 4) {
          if (next === store.safeCode) {
            audioEngine.uiBeep(880, 0.12);
            store.openSafe();
            store.notify('A tranquilizer gun?! Click — shoot. Why does Mom own this?');
          } else {
            // the safe buzzes angrily — Mom can hear that
            audioEngine.uiBeep(160, 0.25);
            emitNoise(SAFE_POS[0], SAFE_POS[2], SAFE_WRONG_CODE_NOISE, 'safe');
            setShake(true);
            setTimeout(() => setShake(false), 450);
            return '';
          }
        }
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`keypad ${shake ? 'keypad-shake' : ''}`}>
      <div className="keypad-title">SAFE — ENTER CODE</div>
      <div className="keypad-display">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`keypad-digit ${entry[i] ? 'filled' : ''}`}>
            {entry[i] ?? '·'}
          </span>
        ))}
      </div>
      <div className="keypad-hint">0–9 type · backspace · E/ESC step away</div>
    </div>
  );
}

/** Single floor canvas for the dual-map display. */
function FloorCanvas({ level, label }: { level: 0 | 1; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floorRooms = ROOMS.filter((r) => r.level === level);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const S = 11; // px per meter
    const PAD = 4;
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(8,10,18,0.82)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      // rooms
      for (const r of floorRooms) {
        ctx.strokeStyle = '#3d4566';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x0 * S + PAD, r.z0 * S + PAD, (r.x1 - r.x0) * S, (r.z1 - r.z0) * S);
        ctx.fillStyle = '#5a648c';
        ctx.font = '8px monospace';
        ctx.fillText(r.label.toUpperCase(), r.x0 * S + PAD + 3, r.z0 * S + PAD + 12);
      }

      // phone spot marker (hint revealed or ≥4 hints)
      const store = useGameStore.getState();
      if (!store.hasPhone && !store.phoneReturned && store.hintsUsed >= 4) {
        const phoneSpot = getSpot(store.phoneSpotId);
        const phoneLevel = phoneSpot.level ?? 0;
        if (phoneLevel === level) {
          const px = phoneSpot.x * S + PAD;
          const pz = phoneSpot.z * S + PAD;
          const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
          if (store.hintRevealed) {
            // full reveal: bright pulsing phone icon
            ctx.fillStyle = `rgba(255, 220, 50, ${0.6 + pulse * 0.4})`;
            ctx.beginPath();
            ctx.arc(px, pz, 4 + pulse * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffdd33';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('📱', px, pz + 3);
            ctx.textAlign = 'start';
          } else {
            // hints 4-5: subtle marker
            ctx.fillStyle = `rgba(255, 200, 80, ${0.3 + pulse * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, pz, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // player (only on this level)
      const playerLevel = runtime.playerY > 1.4 ? 1 : 0;
      if (playerLevel === level) {
        const px = runtime.playerX * S + PAD;
        const pz = runtime.playerZ * S + PAD;
        ctx.fillStyle = '#7ec8ff';
        ctx.beginPath();
        ctx.arc(px, pz, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7ec8ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.lineTo(px - Math.sin(playerLook.yaw) * 8, pz - Math.cos(playerLook.yaw) * 8);
        ctx.stroke();
      }
      // mom (only on this level)
      if (runtime.momLevel === level) {
        const awake = runtime.momState !== 'sleep';
        ctx.fillStyle = awake ? '#ff5a5a' : '#8a6a6a';
        ctx.beginPath();
        ctx.arc(runtime.momX * S + PAD, runtime.momZ * S + PAD, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // floor label
      ctx.fillStyle = '#555d80';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(label, PAD + 2, cv.height - 4);
    };
    draw();
    const id = setInterval(draw, 160);
    return () => clearInterval(id);
  }, [level, label, floorRooms]);

  return (
    <canvas
      ref={canvasRef}
      width={15 * 11 + 8}
      height={13 * 11 + 8}
      style={{ display: 'block' }}
    />
  );
}

function MapOverlay() {
  const difficulty = useGameStore((s) => s.difficulty);
  const gamePhase = useGameStore((s) => s.gamePhase);

  const visible = gamePhase === 'playing' && difficulty !== 'hard';

  if (!visible) return null;
  return (
    <div className="map-overlay map-dual">
      <FloorCanvas level={1} label="▲ TẦNG 2" />
      <div className="map-divider" />
      <FloorCanvas level={0} label="▼ TẦNG 1" />
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
  const stress = useGameStore((s) => s.stress);
  const difficulty = useGameStore((s) => s.difficulty);
  const hasFlashlight = useGameStore((s) => s.hasFlashlight);
  const hasStorageKey = useGameStore((s) => s.hasStorageKey);
  const knowsCode = useGameStore((s) => s.knowsCode);
  const safeCode = useGameStore((s) => s.safeCode);
  const hasTranqGun = useGameStore((s) => s.hasTranqGun);
  const darts = useGameStore((s) => s.darts);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const hintRevealed = useGameStore((s) => s.hintRevealed);
  const hintText = useGameStore((s) => s.hintText);
  const hasPhone = useGameStore((s) => s.hasPhone);
  const phoneReturned = useGameStore((s) => s.phoneReturned);
  const autoPlay = useGameStore((s) => s.autoPlay);
  const autoPlayStatus = useGameStore((s) => s.autoPlayStatus);
  const autoPlayEnding = useGameStore((s) => s.autoPlayEnding);

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
          {difficulty !== 'hard' && hasFlashlight && (
            <span className="hint-keys">
              {' '}
              · F light
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

        {finaleActive && (
          <div className="finale-banner">PUT IT BACK. GET TO BED.</div>
        )}

        {stress >= 100 && (
          <div className="panic-banner">your heart is pounding — she can hear it</div>
        )}

        <div className="crosshair" />

        {searchProgress !== null && (
          <div className="search-bar">
            <div className="search-fill" style={{ width: `${searchProgress * 100}%` }} />
            <span>opening…</span>
          </div>
        )}

        {prompt && <div className="prompt">{prompt}</div>}
        {subtitle && <div className="subtitle">{subtitle}</div>}

        {(hasStorageKey || knowsCode || hasTranqGun || darts > 0) && (
          <div className="inventory">
            {hasStorageKey && <span className="inv-item">🗝 brass key</span>}
            {knowsCode && <span className="inv-item">✎ code {safeCode}</span>}
            {hasTranqGun && (
              <span className="inv-item inv-gun">
                ➶ tranq gun × {darts} {darts > 0 ? '· CLICK to fire' : '(empty)'}
              </span>
            )}
            {!hasTranqGun && darts > 0 && <span className="inv-item">➶ dart × {darts}</span>}
          </div>
        )}
      </div>

      {/* ── Hint system ──────────────────────────────────────── */}
      {!hasPhone && !phoneReturned && (
        <div className="hint-hud">
          {!hintRevealed && (
            <div className="hint-counter">
              H — Hint ({hintsUsed}/5)
            </div>
          )}
          {hintRevealed && (
            <div className="hint-counter hint-revealed">
              ⚠️ MẸ THÍNH x1.8
            </div>
          )}
        </div>
      )}
      {hintText && (
        <div className={`hint-popup ${hintRevealed ? 'hint-popup-danger' : ''}`}>
          {hintText}
        </div>
      )}

      <Keypad />
      <MapOverlay />
      <CCTVOverlay />
      {autoPlay && (
        <div className="auto-play-indicator">
          <div className="auto-play-badge">
            <span className="auto-play-icon">🤖</span>
            <span className="auto-play-label">BOT PLAYING</span>
          </div>
          <div className="auto-play-ending-label">
            Target: {autoPlayEnding === 'goodnight' ? '🌙 Good Night' : autoPlayEnding === 'coward' ? '🐔 Coward' : '👻 Waiting Kind'}
          </div>
          {autoPlayStatus && (
            <div className="auto-play-status">{autoPlayStatus}</div>
          )}
        </div>
      )}
    </>
  );
}
