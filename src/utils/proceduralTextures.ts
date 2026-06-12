/**
 * proceduralTextures.ts
 * ---------------------
 * Code-generated 256×256 CanvasTextures (Phase 2) — no external image assets
 * (asset strategy, brief §0.4). All textures are cached so every room shares
 * the exact same texture instance (memory + the loop-illusion requirement
 * that corridors look pixel-identical).
 *
 * All textures: RepeatWrapping both axes, sRGB color space. Callers that need
 * a different repeat must CLONE the texture before changing `repeat`
 * (clones share the underlying image, so this stays cheap).
 */

import * as THREE from 'three';

const SIZE = 256;
const cache = new Map<string, THREE.CanvasTexture>();

function makeContext(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [canvas, ctx];
}

function finalize(canvas: HTMLCanvasElement, repeatX: number, repeatY: number) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

/** Dark office carpet: #3a3530 base, ~3000 noise dots, faint diagonal weave. */
export function createCarpetTexture(): THREE.CanvasTexture {
  const cached = cache.get('carpet');
  if (cached) return cached;

  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#3a3530';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ~3000 random dots between #322d28 and #46403a.
  const from = [0x32, 0x2d, 0x28];
  const to = [0x46, 0x40, 0x3a];
  for (let i = 0; i < 3000; i++) {
    const t = Math.random();
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1.5, 1.5);
  }

  // Faint diagonal stripes every 6 px.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
  ctx.lineWidth = 1;
  for (let x = -SIZE; x < SIZE * 2; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + SIZE, SIZE);
    ctx.stroke();
  }

  const tex = finalize(canvas, 4, 4);
  cache.set('carpet', tex);
  return tex;
}

/** Drop-ceiling tiles: #e8e4da base, grey 64px grid, 2–3 water stains. */
export function createCeilingTileTexture(): THREE.CanvasTexture {
  const cached = cache.get('ceiling');
  if (cached) return cached;

  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#e8e4da';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 1px grid every 64px.
  ctx.strokeStyle = '#cfcabd';
  ctx.lineWidth = 1;
  for (let i = 0; i <= SIZE; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(SIZE, i + 0.5);
    ctx.stroke();
  }

  // 2–3 water stains (radial gradients, #cdbb8a @ 0.15 alpha).
  const stains = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < stains; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE;
    const radius = 24 + Math.random() * 40;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
    grad.addColorStop(0, 'rgba(205, 187, 138, 0.15)');
    grad.addColorStop(0.7, 'rgba(205, 187, 138, 0.10)');
    grad.addColorStop(1, 'rgba(205, 187, 138, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  const tex = finalize(canvas, 1, 1);
  cache.set('ceiling', tex);
  return tex;
}

/** Aged office wallpaper: #c9c2b4 base, faint vertical stripes, grain. */
export function createWallpaperTexture(): THREE.CanvasTexture {
  const cached = cache.get('wallpaper');
  if (cached) return cached;

  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#c9c2b4';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Vertical stripes: 2px wide, 24px apart, low opacity.
  ctx.fillStyle = 'rgba(189, 182, 168, 0.55)';
  for (let x = 0; x < SIZE; x += 24) {
    ctx.fillRect(x, 0, 2, SIZE);
  }

  // Light grain noise.
  for (let i = 0; i < 1800; i++) {
    const v = Math.random();
    ctx.fillStyle =
      v > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(40,36,30,0.045)';
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1, 1);
  }

  const tex = finalize(canvas, 2, 1);
  cache.set('wallpaper', tex);
  return tex;
}
