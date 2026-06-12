/**
 * proceduralTextures.ts — code-generated CanvasTextures, zero image assets.
 * Palette follows GDD §19 (dark interior, no bright colors).
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

function grain(ctx: CanvasRenderingContext2D, n: number, light: string, dark: string) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? light : dark;
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1.4, 1.4);
  }
}

/** Bedroom/living carpet — muted dark plum (GDD: #2C1F3D family). */
export function createCarpetTexture(): THREE.CanvasTexture {
  const c = cache.get('carpet');
  if (c) return c;
  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#4a3c5e';
  ctx.fillRect(0, 0, SIZE, SIZE);
  grain(ctx, 3500, 'rgba(70,56,92,0.5)', 'rgba(18,12,26,0.55)');
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  for (let x = -SIZE; x < SIZE * 2; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + SIZE, SIZE);
    ctx.stroke();
  }
  const tex = finalize(canvas, 3, 3);
  cache.set('carpet', tex);
  return tex;
}

/** Kitchen/bathroom tile — cold desaturated teal-grey with grout grid. */
export function createTileTexture(): THREE.CanvasTexture {
  const c = cache.get('tile');
  if (c) return c;
  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#405454';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = '#243333';
  ctx.lineWidth = 3;
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
  // subtle sheen variation per tile
  for (let tx = 0; tx < SIZE; tx += 64) {
    for (let ty = 0; ty < SIZE; ty += 64) {
      ctx.fillStyle = `rgba(255,255,255,${0.015 + Math.random() * 0.03})`;
      ctx.fillRect(tx + 3, ty + 3, 58, 58);
    }
  }
  grain(ctx, 1200, 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.06)');
  const tex = finalize(canvas, 4, 4);
  cache.set('tile', tex);
  return tex;
}

/** Hallway/storage wood — dark planks with visible boards. */
export function createWoodTexture(): THREE.CanvasTexture {
  const c = cache.get('wood');
  if (c) return c;
  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#5c4128';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const plankH = 32;
  for (let y = 0; y < SIZE; y += plankH) {
    const shade = 0.85 + Math.random() * 0.3;
    ctx.fillStyle = `rgb(${Math.round(98 * shade)},${Math.round(72 * shade)},${Math.round(46 * shade)})`;
    ctx.fillRect(0, y, SIZE, plankH - 2);
    // wood grain lines
    ctx.strokeStyle = 'rgba(20,12,6,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const gy = y + 4 + Math.random() * (plankH - 8);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(SIZE * 0.3, gy + 3, SIZE * 0.6, gy - 3, SIZE, gy + 1);
      ctx.stroke();
    }
    // plank seam
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y + plankH - 2, SIZE, 2);
    // butt joints
    const bx = Math.random() * SIZE;
    ctx.fillRect(bx, y, 2, plankH - 2);
  }
  const tex = finalize(canvas, 2.5, 2.5);
  cache.set('wood', tex);
  return tex;
}

/** Walls — deep night blue plaster (GDD: #1A1A2E). */
export function createWallTexture(): THREE.CanvasTexture {
  const c = cache.get('wall');
  if (c) return c;
  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#3e4160';
  ctx.fillRect(0, 0, SIZE, SIZE);
  grain(ctx, 2200, 'rgba(255,255,255,0.025)', 'rgba(0,0,0,0.06)');
  // faint vertical wallpaper stripes
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  for (let x = 0; x < SIZE; x += 28) ctx.fillRect(x, 0, 3, SIZE);
  const tex = finalize(canvas, 2, 1);
  cache.set('wall', tex);
  return tex;
}

/** Ceiling — near-black plaster. */
export function createCeilingTexture(): THREE.CanvasTexture {
  const c = cache.get('ceil');
  if (c) return c;
  const [canvas, ctx] = makeContext();
  ctx.fillStyle = '#2e3048';
  ctx.fillRect(0, 0, SIZE, SIZE);
  grain(ctx, 1500, 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.05)');
  const tex = finalize(canvas, 2, 2);
  cache.set('ceil', tex);
  return tex;
}

/** Fabric for beds/sofa. */
export function createFabricTexture(base: string, key: string): THREE.CanvasTexture {
  const c = cache.get(`fabric_${key}`);
  if (c) return c;
  const [canvas, ctx] = makeContext();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  grain(ctx, 2600, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.08)');
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < SIZE; y += 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }
  const tex = finalize(canvas, 1.5, 1.5);
  cache.set(`fabric_${key}`, tex);
  return tex;
}
