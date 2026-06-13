/**
 * HUD.tsx — diegetic-light HUD per GDD §18: objective, context prompt,
 * notifications, subtitles, search progress, finale banner, panic flash,
 * stress vignette, crosshair, and the floor-plan map (difficulty-dependent).
 */

import { useEffect, useRef, useState } from 'react';
import { ROOMS } from '../../game/house';
import { emitNoise, runtime } from '../../game/runtime';
import { playerLook } from '../../systems/playerLook';
import { useGameStore } from '../../state/gameStore';
import { audioEngine } from '../../systems/audio';
import { SAFE_POS, SAFE_WRONG_CODE_NOISE } from '../../constants';

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

function MapOverlay() {
  const difficulty = useGameStore((s) => s.difficulty);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const [open, setOpen] = useState(false);
  /** Which floor the map is showing: 0 = ground, 1 = upstairs */
  const [viewFloor, setViewFloor] = useState<0 | 1>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Auto-follow the player's floor */
  const autoFloorRef = useRef(true);

  useEffect(() => {
    if (difficulty === 'hard') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' || e.code === 'Tab') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      /* 1 / 2 to switch floor manually */
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        setViewFloor(0);
        autoFloorRef.current = false;
      }
      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        setViewFloor(1);
        autoFloorRef.current = false;
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
    const PAD = 4;

    const draw = () => {
      /* Auto-follow player floor when not manually overridden */
      const pLevel = runtime.playerLevel as 0 | 1;
      if (autoFloorRef.current) {
        setViewFloor(pLevel);
      }

      const floor = viewFloor;
      const floorRooms = ROOMS.filter((r) => r.level === floor);

      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(8,10,18,0.82)';
      ctx.fillRect(0, 0, cv.width, cv.height);

      /* rooms for the viewed floor */
      for (const r of floorRooms) {
        ctx.strokeStyle = '#3d4566';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          r.x0 * S + PAD,
          r.z0 * S + PAD,
          (r.x1 - r.x0) * S,
          (r.z1 - r.z0) * S,
        );
        ctx.fillStyle = '#5a648c';
        ctx.font = '9px monospace';
        ctx.fillText(r.label.toUpperCase(), r.x0 * S + 8, r.z0 * S + 16);
      }

      /* staircase indicator */
      ctx.fillStyle = 'rgba(120,180,255,0.12)';
      if (floor === 0) {
        /* ground floor: stairs area in kitchen */
        ctx.fillRect(13.8 * S + PAD, 5.0 * S + PAD, (15 - 13.8) * S, (8.0 - 5.0) * S);
        ctx.fillStyle = '#5a7fa0';
        ctx.font = '8px monospace';
        ctx.fillText('↑STAIRS', 13.8 * S + 6, 6.8 * S + PAD);
      } else {
        /* upstairs: stairwell hole */
        ctx.fillRect(13.8 * S + PAD, 4.69 * S + PAD, (15 - 13.8) * S, (7.9 - 4.69) * S);
        ctx.fillStyle = '#5a7fa0';
        ctx.font = '8px monospace';
        ctx.fillText('↓STAIRS', 13.8 * S + 6, 6.5 * S + PAD);
      }

      /* player dot */
      const onThisFloor = pLevel === floor;
      const px = runtime.playerX * S + PAD;
      const pz = runtime.playerZ * S + PAD;
      if (onThisFloor) {
        ctx.fillStyle = '#7ec8ff';
        ctx.beginPath();
        ctx.arc(px, pz, 4, 0, Math.PI * 2);
        ctx.fill();
        /* direction line */
        ctx.strokeStyle = '#7ec8ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.lineTo(
          px - Math.sin(playerLook.yaw) * 9,
          pz - Math.cos(playerLook.yaw) * 9,
        );
        ctx.stroke();
      } else {
        /* faded player indicator when on other floor */
        ctx.fillStyle = 'rgba(126,200,255,0.25)';
        ctx.beginPath();
        ctx.arc(px, pz, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      /* mom dot */
      const momOnFloor = (runtime.momLevel as 0 | 1) === floor;
      const mx = runtime.momX * S + PAD;
      const mz = runtime.momZ * S + PAD;
      const awake = runtime.momState !== 'sleep';
      if (momOnFloor) {
        ctx.fillStyle = awake ? '#ff5a5a' : '#8a6a6a';
        ctx.beginPath();
        ctx.arc(mx, mz, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        /* faded mom when on other floor */
        ctx.fillStyle = awake ? 'rgba(255,90,90,0.2)' : 'rgba(138,106,106,0.15)';
        ctx.beginPath();
        ctx.arc(mx, mz, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    const id = setInterval(draw, 160);
    return () => clearInterval(id);
  }, [visible, viewFloor]);

  if (!visible) return null;
  return (
    <div className="map-overlay">
      <div className="map-tabs">
        <button
          className={`map-tab ${viewFloor === 0 ? 'map-tab-active' : ''}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            setViewFloor(0);
            autoFloorRef.current = false;
          }}
        >
          1F
        </button>
        <button
          className={`map-tab ${viewFloor === 1 ? 'map-tab-active' : ''}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            setViewFloor(1);
            autoFloorRef.current = false;
          }}
        >
          2F
        </button>
      </div>
      <canvas ref={canvasRef} width={15 * 12 + 8} height={13 * 12 + 8} />
      <div className="map-caption">
        M close · 1/2 floor
      </div>
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
      <Keypad />
      <MapOverlay />
    </>
  );
}
