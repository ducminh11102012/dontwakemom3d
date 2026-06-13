/**
 * proceduralTextures.ts — code-generated CanvasTextures, zero image assets.
 * Granny-style old-house palette: dirty cream plaster, worn wood, stained ceilings.
 */

import * as THREE from 'three';

const SIZE = 512; // bumped for more detail
const cache = new Map<string, THREE.CanvasTexture>();

function makeContext(size = SIZE): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
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

function grain(ctx: CanvasRenderingContext2D, n: number, light: string, dark: string, sz = 1.4) {
  const s = ctx.canvas.width;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? light : dark;
    ctx.fillRect(Math.random() * s, Math.random() * s, sz, sz);
  }
}

/** Simple seeded random for repeatable patterns */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Wall: dirty cream/beige plaster (Granny style) ──────────────────────────

export function createWallTexture(): THREE.CanvasTexture {
  const c = cache.get('wall');
  if (c) return c;
  const [canvas, ctx] = makeContext();

  // base: warm dirty plaster
  ctx.fillStyle = '#7a7060';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // subtle color variation patches (old paint unevenness)
  const rng = seeded(42);
  for (let i = 0; i < 18; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 40 + rng() * 80;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rng() > 0.5 ? 'rgba(95,85,70,0.25)' : 'rgba(60,55,48,0.2)';
    grad.addColorStop(0, tone);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // vertical water streaks (from leaks)
  for (let i = 0; i < 5; i++) {
    const x = rng() * SIZE;
    const w = 3 + rng() * 8;
    const h = 80 + rng() * SIZE * 0.6;
    const y0 = rng() * SIZE * 0.3;
    const grad = ctx.createLinearGradient(x, y0, x, y0 + h);
    grad.addColorStop(0, 'rgba(50,45,35,0.15)');
    grad.addColorStop(0.5, 'rgba(55,48,38,0.2)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - w / 2, y0, w, h);
  }

  // horizontal water stain lines
  for (let i = 0; i < 3; i++) {
    const y = 100 + rng() * (SIZE - 200);
    ctx.strokeStyle = `rgba(50,42,32,${0.08 + rng() * 0.1})`;
    ctx.lineWidth = 1.5 + rng() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < SIZE; x += 20) {
      ctx.lineTo(x, y + (rng() - 0.5) * 4);
    }
    ctx.stroke();
  }

  // cracks
  for (let i = 0; i < 4; i++) {
    const x0 = rng() * SIZE;
    const y0 = rng() * SIZE;
    ctx.strokeStyle = `rgba(30,25,18,${0.15 + rng() * 0.12})`;
    ctx.lineWidth = 0.5 + rng() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let cx = x0, cy = y0;
    const segs = 3 + Math.floor(rng() * 5);
    for (let j = 0; j < segs; j++) {
      cx += (rng() - 0.5) * 60;
      cy += 15 + rng() * 35;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // mold/dirt spots
  for (let i = 0; i < 12; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 3 + rng() * 12;
    ctx.fillStyle = `rgba(35,30,20,${0.06 + rng() * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // faint wallpaper stripe pattern (old, worn)
  ctx.globalAlpha = 0.04;
  for (let x = 0; x < SIZE; x += 24) {
    ctx.fillStyle = '#8a7e6c';
    ctx.fillRect(x, 0, 2, SIZE);
  }
  ctx.globalAlpha = 1;

  // plaster grain
  grain(ctx, 4000, 'rgba(140,130,110,0.06)', 'rgba(30,25,18,0.08)');

  const tex = finalize(canvas, 2, 1);
  cache.set('wall', tex);
  return tex;
}

// ── Carpet: dark worn pile ──────────────────────────────────────────────────

export function createCarpetTexture(): THREE.CanvasTexture {
  const c = cache.get('carpet');
  if (c) return c;
  const [canvas, ctx] = makeContext();

  // dark muted plum/maroon base
  ctx.fillStyle = '#3e2c36';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // worn patches (lighter areas from foot traffic)
  const rng = seeded(17);
  for (let i = 0; i < 8; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 30 + rng() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(80,60,65,0.3)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // pile texture (diagonal lines)
  grain(ctx, 5000, 'rgba(70,50,55,0.4)', 'rgba(18,10,14,0.45)');
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.8;
  for (let x = -SIZE; x < SIZE * 2; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + SIZE, SIZE);
    ctx.stroke();
  }

  // dirt stains
  for (let i = 0; i < 5; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 8 + rng() * 20;
    ctx.fillStyle = `rgba(20,12,14,${0.08 + rng() * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = finalize(canvas, 3, 3);
  cache.set('carpet', tex);
  return tex;
}

// ── Tile: cold grey-green with cracked grout ────────────────────────────────

export function createTileTexture(): THREE.CanvasTexture {
  const c = cache.get('tile');
  if (c) return c;
  const [canvas, ctx] = makeContext();

  // cold desaturated grey-green
  ctx.fillStyle = '#4a5450';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const TILE = 64;
  const rng = seeded(91);

  // grout lines (darker, dirty)
  ctx.strokeStyle = '#252e2a';
  ctx.lineWidth = 4;
  for (let i = 0; i <= SIZE; i += TILE) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(SIZE, i + 0.5);
    ctx.stroke();
  }

  // individual tile color variation + sheen
  for (let tx = 0; tx < SIZE; tx += TILE) {
    for (let ty = 0; ty < SIZE; ty += TILE) {
      const v = rng();
      const shade = v > 0.7 ? 'rgba(255,255,255,0.04)' : v > 0.3 ? 'rgba(0,0,0,0.03)' : 'rgba(70,80,75,0.06)';
      ctx.fillStyle = shade;
      ctx.fillRect(tx + 4, ty + 4, TILE - 8, TILE - 8);
    }
  }

  // random cracked tiles
  for (let i = 0; i < 3; i++) {
    const tx = Math.floor(rng() * (SIZE / TILE)) * TILE + TILE / 2;
    const ty = Math.floor(rng() * (SIZE / TILE)) * TILE + TILE / 2;
    ctx.strokeStyle = `rgba(20,25,22,${0.2 + rng() * 0.15})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tx - 15 + rng() * 10, ty - 15 + rng() * 10);
    ctx.lineTo(tx + rng() * 10, ty + rng() * 10);
    ctx.lineTo(tx + 10 + rng() * 10, ty + 15 + rng() * 5);
    ctx.stroke();
  }

  // dirt in grout
  grain(ctx, 2000, 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.06)', 1.8);

  const tex = finalize(canvas, 4, 4);
  cache.set('tile', tex);
  return tex;
}

// ── Wood floor: dark worn planks ────────────────────────────────────────────

export function createWoodTexture(): THREE.CanvasTexture {
  const c = cache.get('wood');
  if (c) return c;
  const [canvas, ctx] = makeContext();

  ctx.fillStyle = '#42301c';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const plankH = 42;
  const rng = seeded(33);

  for (let y = 0; y < SIZE; y += plankH) {
    // plank color variation
    const shade = 0.8 + rng() * 0.4;
    const r = Math.round(66 * shade);
    const g = Math.round(48 * shade);
    const b = Math.round(28 * shade);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, SIZE, plankH - 2);

    // wood grain lines (more detailed)
    for (let i = 0; i < 8; i++) {
      const gy = y + 3 + rng() * (plankH - 6);
      ctx.strokeStyle = `rgba(20,12,6,${0.15 + rng() * 0.2})`;
      ctx.lineWidth = 0.5 + rng() * 0.8;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      const amp = 1 + rng() * 3;
      for (let x = 0; x < SIZE; x += 30) {
        ctx.lineTo(x, gy + (rng() - 0.5) * amp);
      }
      ctx.lineTo(SIZE, gy + (rng() - 0.5) * amp);
      ctx.stroke();
    }

    // knots (random chance per plank)
    if (rng() > 0.75) {
      const kx = 30 + rng() * (SIZE - 60);
      const ky = y + plankH / 2;
      const kr = 4 + rng() * 6;
      ctx.fillStyle = `rgba(30,18,8,${0.25 + rng() * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr * 1.4, kr, 0, 0, Math.PI * 2);
      ctx.fill();
      // knot rings
      ctx.strokeStyle = `rgba(25,15,5,0.15)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr * 2.2, kr * 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // plank seam (dark gap)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, y + plankH - 2, SIZE, 2);

    // butt joints (where planks end)
    if (rng() > 0.4) {
      const bx = 60 + rng() * (SIZE - 120);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx, y, 2, plankH - 2);
    }
  }

  // wear/scuff marks
  for (let i = 0; i < 6; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    ctx.fillStyle = `rgba(80,60,35,${0.08 + rng() * 0.06})`;
    ctx.fillRect(x, y, 15 + rng() * 40, 2 + rng() * 4);
  }

  grain(ctx, 2000, 'rgba(80,60,35,0.03)', 'rgba(0,0,0,0.05)');

  const tex = finalize(canvas, 2.5, 2.5);
  cache.set('wood', tex);
  return tex;
}

// ── Ceiling: old yellowed plaster with water stains ─────────────────────────

export function createCeilingTexture(): THREE.CanvasTexture {
  const c = cache.get('ceil');
  if (c) return c;
  const [canvas, ctx] = makeContext();

  // off-white / grey plaster
  ctx.fillStyle = '#3a3832';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const rng = seeded(77);

  // water stain rings
  for (let i = 0; i < 4; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 20 + rng() * 50;
    ctx.strokeStyle = `rgba(50,40,28,${0.1 + rng() * 0.1})`;
    ctx.lineWidth = 2 + rng() * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    // inner stain
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
    grad.addColorStop(0, `rgba(55,45,30,${0.06 + rng() * 0.06})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // yellowing patches
  for (let i = 0; i < 5; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 30 + rng() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(60,50,30,0.08)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // cracks
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(20,18,12,${0.1 + rng() * 0.08})`;
    ctx.lineWidth = 0.5 + rng() * 0.8;
    ctx.beginPath();
    let cx = rng() * SIZE, cy = rng() * SIZE;
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 4; j++) {
      cx += (rng() - 0.5) * 50;
      cy += (rng() - 0.5) * 50;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  grain(ctx, 2500, 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.04)');

  const tex = finalize(canvas, 2, 2);
  cache.set('ceil', tex);
  return tex;
}

// ── Fabric for beds/sofa ────────────────────────────────────────────────────

export function createFabricTexture(base: string, key: string): THREE.CanvasTexture {
  const c = cache.get(`fabric_${key}`);
  if (c) return c;
  const [canvas, ctx] = makeContext();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // weave pattern
  grain(ctx, 4000, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.08)');
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 0.6;
  for (let y = 0; y < SIZE; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }
  for (let x = 0; x < SIZE; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SIZE);
    ctx.stroke();
  }

  const tex = finalize(canvas, 1.5, 1.5);
  cache.set(`fabric_${key}`, tex);
  return tex;
}

// ── Baseboard: dark stained wood trim ───────────────────────────────────────

export function createBaseboardTexture(): THREE.CanvasTexture {
  const c = cache.get('baseboard');
  if (c) return c;
  const [canvas, ctx] = makeContext(256);
  const S = 256;

  // dark stained wood
  ctx.fillStyle = '#2a1e14';
  ctx.fillRect(0, 0, S, S);

  // horizontal grain
  const rng = seeded(55);
  for (let i = 0; i < 30; i++) {
    const y = rng() * S;
    ctx.strokeStyle = `rgba(15,8,4,${0.15 + rng() * 0.15})`;
    ctx.lineWidth = 0.5 + rng() * 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < S; x += 25) {
      ctx.lineTo(x, y + (rng() - 0.5) * 2);
    }
    ctx.stroke();
  }

  // top edge highlight
  ctx.fillStyle = 'rgba(80,60,40,0.15)';
  ctx.fillRect(0, 0, S, 3);

  grain(ctx, 1500, 'rgba(60,40,25,0.05)', 'rgba(0,0,0,0.06)');

  const tex = finalize(canvas, 4, 1);
  cache.set('baseboard', tex);
  return tex;
}

// ── Door frame: medium stained wood ─────────────────────────────────────────

export function createDoorFrameTexture(): THREE.CanvasTexture {
  const c = cache.get('doorframe');
  if (c) return c;
  const [canvas, ctx] = makeContext(256);
  const S = 256;

  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, S, S);

  const rng = seeded(63);
  for (let i = 0; i < 20; i++) {
    const y = rng() * S;
    ctx.strokeStyle = `rgba(20,12,6,${0.12 + rng() * 0.12})`;
    ctx.lineWidth = 0.5 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y + (rng() - 0.5) * 3);
    ctx.stroke();
  }

  grain(ctx, 1200, 'rgba(70,50,30,0.04)', 'rgba(0,0,0,0.05)');

  const tex = finalize(canvas, 1, 3);
  cache.set('doorframe', tex);
  return tex;
}

// ── Wainscoting: lower wall panel texture ───────────────────────────────────

export function createWainscotTexture(): THREE.CanvasTexture {
  const c = cache.get('wainscot');
  if (c) return c;
  const [canvas, ctx] = makeContext();

  // slightly darker than walls, with panel pattern
  ctx.fillStyle = '#5c5448';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // vertical panel divisions
  const panelW = 85;
  ctx.strokeStyle = 'rgba(30,25,18,0.2)';
  ctx.lineWidth = 2;
  for (let x = 0; x < SIZE; x += panelW) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SIZE);
    ctx.stroke();
  }

  // inner panel rectangle (inset look)
  for (let x = 0; x < SIZE; x += panelW) {
    const inset = 8;
    // shadow edge (top and left inner)
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x + inset, inset, panelW - inset * 2, 2);
    ctx.fillRect(x + inset, inset, 2, SIZE - inset * 2);
    // highlight edge (bottom and right inner)
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x + inset, SIZE - inset - 2, panelW - inset * 2, 2);
    ctx.fillRect(x + panelW - inset - 2, inset, 2, SIZE - inset * 2);
  }

  grain(ctx, 3000, 'rgba(100,90,70,0.04)', 'rgba(0,0,0,0.06)');

  const tex = finalize(canvas, 2, 1);
  cache.set('wainscot', tex);
  return tex;
}
