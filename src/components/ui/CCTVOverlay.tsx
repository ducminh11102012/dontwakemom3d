/**
 * CCTVOverlay.tsx — When the player stands near the CCTV monitors in the
 * upstairs CCTV room, show a green-tinted camera feed overlay.
 * Uses HTML Canvas to render top-down room views with entity markers.
 * No WebGL render targets — avoids all postprocessing conflicts.
 */

import { useEffect, useRef, useState } from 'react';
import { ROOMS } from '../../game/house';
import { runtime } from '../../game/runtime';
import { useGameStore } from '../../state/gameStore';

/** Camera feed configuration */
const FEEDS = [
  { label: 'CAM 1 — HALLWAY', rooms: ['hallway', 'living'], cx: 7.75, cz: 7.5, range: 6 },
  { label: 'CAM 2 — KITCHEN', rooms: ['kitchen'], cx: 12.6, cz: 4.5, range: 5 },
  { label: 'CAM 3 — MOM\'S ROOM', rooms: ['momRoom'], cx: 2.5, cz: 6.5, range: 4 },
  { label: 'CAM 4 — UPSTAIRS', rooms: ['upHall', 'upGuest', 'upStudy'], cx: 7.5, cz: 5.5, range: 8 },
];

function drawFeed(
  ctx: CanvasRenderingContext2D,
  feed: (typeof FEEDS)[number],
  w: number,
  h: number,
  time: number,
) {
  const S = w / (feed.range * 2); // scale
  const ox = w / 2;
  const oz = h / 2;

  // Background
  ctx.fillStyle = '#020a04';
  ctx.fillRect(0, 0, w, h);

  // Scanlines
  ctx.strokeStyle = 'rgba(0,255,0,0.03)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw rooms
  for (const r of ROOMS) {
    const inView = feed.rooms.includes(r.id) ||
      (r.x0 < feed.cx + feed.range && r.x1 > feed.cx - feed.range &&
       r.z0 < feed.cz + feed.range && r.z1 > feed.cz - feed.range);
    if (!inView) continue;

    const x0 = ox + (r.x0 - feed.cx) * S;
    const z0 = oz + (r.z0 - feed.cz) * S;
    const rw = (r.x1 - r.x0) * S;
    const rh = (r.z1 - r.z0) * S;

    // Room fill
    ctx.fillStyle = feed.rooms.includes(r.id)
      ? 'rgba(0,60,0,0.3)'
      : 'rgba(0,30,0,0.15)';
    ctx.fillRect(x0, z0, rw, rh);

    // Room border
    ctx.strokeStyle = '#0a4a0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, z0, rw, rh);

    // Room label
    if (feed.rooms.includes(r.id)) {
      ctx.fillStyle = '#0a6a0a';
      ctx.font = '8px monospace';
      ctx.fillText(r.label.toUpperCase(), x0 + 3, z0 + 10);
    }
  }

  // Draw Mom
  const momInView =
    runtime.momX > feed.cx - feed.range && runtime.momX < feed.cx + feed.range &&
    runtime.momZ > feed.cz - feed.range && runtime.momZ < feed.cz + feed.range;
  if (momInView) {
    const mx = ox + (runtime.momX - feed.cx) * S;
    const mz = oz + (runtime.momZ - feed.cz) * S;
    const isAwake = runtime.momState !== 'sleep' && runtime.momState !== 'tranq';

    // Mom dot
    ctx.fillStyle = isAwake ? '#ff3030' : '#804040';
    ctx.beginPath();
    ctx.arc(mx, mz, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing ring when awake
    if (isAwake) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.strokeStyle = `rgba(255,48,48,${0.3 + 0.4 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, mz, 6 + 3 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = isAwake ? '#ff5050' : '#806060';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(isAwake ? 'MOM ⚠' : 'MOM', mx + 7, mz + 3);
  }

  // Draw Player (if visible)
  const plInView =
    runtime.playerX > feed.cx - feed.range && runtime.playerX < feed.cx + feed.range &&
    runtime.playerZ > feed.cz - feed.range && runtime.playerZ < feed.cz + feed.range;
  if (plInView) {
    const px = ox + (runtime.playerX - feed.cx) * S;
    const pz = oz + (runtime.playerZ - feed.cz) * S;
    ctx.fillStyle = '#30ff30';
    ctx.beginPath();
    ctx.arc(px, pz, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Camera label
  ctx.fillStyle = '#0aaa0a';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(feed.label, 4, h - 6);

  // Timestamp
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  ctx.fillStyle = '#0a8a0a';
  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(ts, w - 4, h - 6);
  ctx.textAlign = 'left';

  // REC indicator with blinking dot
  const blink = Math.sin(time * 3) > 0;
  if (blink) {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(w - 14, 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('REC', w - 20, 14);
  ctx.textAlign = 'left';

  // Random static noise flicker
  if (Math.random() < 0.02) {
    ctx.fillStyle = `rgba(0,255,0,${0.03 + Math.random() * 0.05})`;
    const ny = Math.random() * h;
    ctx.fillRect(0, ny, w, 2 + Math.random() * 6);
  }
}

export default function CCTVOverlay() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([null, null, null, null]);
  const [visible, setVisible] = useState(false);

  // Check if player is in CCTV room and near the monitors
  useEffect(() => {
    if (gamePhase !== 'playing') {
      setVisible(false);
      return;
    }
    const id = setInterval(() => {
      const inCCTV =
        runtime.playerRoom === 'upStudy' &&
        runtime.playerZ < 2.0 &&
        runtime.playerX > 0.5 && runtime.playerX < 4.5;
      setVisible(inCCTV);
    }, 200);
    return () => clearInterval(id);
  }, [gamePhase]);

  // Render loop
  useEffect(() => {
    if (!visible) return;
    let running = true;
    const animate = () => {
      if (!running) return;
      const time = performance.now() / 1000;
      for (let i = 0; i < 4; i++) {
        const cv = canvasRefs.current[i];
        if (!cv) continue;
        const ctx = cv.getContext('2d');
        if (!ctx) continue;
        drawFeed(ctx, FEEDS[i], cv.width, cv.height, time);
      }
      requestAnimationFrame(animate);
    };
    animate();
    return () => { running = false; };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="cctv-overlay">
      <div className="cctv-header">
        SECURITY SYSTEM — LIVE FEED
        <span className="cctv-status">● ONLINE</span>
      </div>
      <div className="cctv-grid">
        {FEEDS.map((_, i) => (
          <canvas
            key={i}
            ref={(el) => { canvasRefs.current[i] = el; }}
            width={200}
            height={150}
            className="cctv-feed"
          />
        ))}
      </div>
      <div className="cctv-footer">
        walk away from the desk to close
      </div>
    </div>
  );
}
