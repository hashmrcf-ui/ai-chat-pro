import * as THREE from 'three';

// Paints a Yemeni tower-house facade onto a canvas: stone courses, white gypsum
// friezes between floors, framed windows crowned by qamariya fanlights. A second
// canvas holds the night glow (lit rooms + coloured qamariya glass).

const FLOOR_H = 3; // metres per storey

const QAMARIYA_DAY = ['#5a2f2a', '#2c3c52', '#36472f', '#5a4a26', '#4a2d45'];
const QAMARIYA_NIGHT = ['#ff3b2f', '#2f6bff', '#2fd66b', '#ffc12f', '#ff2fa0'];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FacadeOptions {
  widthM: number;
  floors: number;
  stoneFloors: number; // lower storeys in dark basalt with small openings
  grand?: boolean; // the rooftop mafraj: tall windows, large fanlights
  seed: number;
  ppm: number; // pixels per metre
}

function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: string, ppm: number, rand: () => number) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  // Mottling.
  for (let i = 0; i < (w * h) / 90; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,240,215,0.06)' : 'rgba(20,10,0,0.08)';
    const s = 2 + rand() * 6;
    ctx.fillRect(x + rand() * w, y + rand() * h, s, s * 0.6);
  }
  // Coursed masonry.
  const course = 0.45 * ppm;
  ctx.strokeStyle = 'rgba(25,15,8,0.35)';
  ctx.lineWidth = Math.max(1, ppm / 40);
  for (let cy = y + h; cy > y; cy -= course) {
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + w, cy);
    ctx.stroke();
    const offset = rand() * 0.9 * ppm;
    for (let cx = x + offset; cx < x + w; cx += (0.7 + rand() * 0.6) * ppm) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, Math.max(y, cy - course));
      ctx.stroke();
    }
  }
}

function drawFrieze(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ppm: number) {
  const bandH = 0.32 * ppm;
  ctx.fillStyle = '#efe7d6';
  ctx.fillRect(x, y, w, bandH);
  // Zig-zag relief, the signature of Sana'ani gypsum work.
  ctx.fillStyle = '#cfc4ae';
  const tooth = 0.22 * ppm;
  for (let tx = x; tx < x + w; tx += tooth) {
    ctx.beginPath();
    ctx.moveTo(tx, y + bandH * 0.78);
    ctx.lineTo(tx + tooth / 2, y + bandH * 0.22);
    ctx.lineTo(tx + tooth, y + bandH * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#efe7d6';
  ctx.fillRect(x, y + bandH + 0.08 * ppm, w, 0.06 * ppm);
}

function fanPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, a0, a1);
  ctx.closePath();
}

export function buildFacade(opts: FacadeOptions) {
  const { widthM, floors, stoneFloors, grand, seed, ppm } = opts;
  const rand = mulberry32(seed);
  const W = Math.round(widthM * ppm);
  const H = Math.round(floors * FLOOR_H * ppm);

  const day = document.createElement('canvas');
  const night = document.createElement('canvas');
  day.width = night.width = W;
  day.height = night.height = H;
  const d = day.getContext('2d')!;
  const n = night.getContext('2d')!;
  n.fillStyle = '#000';
  n.fillRect(0, 0, W, H);

  for (let f = 0; f < floors; f++) {
    const top = H - (f + 1) * FLOOR_H * ppm;
    const fh = FLOOR_H * ppm;
    const basalt = f < stoneFloors;
    drawStone(d, 0, top, W, fh, basalt ? '#3b332d' : '#b0916d', ppm, rand);
    drawFrieze(d, 0, top, W, ppm);

    // Window rhythm.
    const spacing = grand ? 1.9 : basalt ? 3.2 : 2.5;
    const count = Math.max(1, Math.floor((widthM - 0.6) / spacing));
    const step = widthM / count;
    for (let i = 0; i < count; i++) {
      const cx = (i + 0.5) * step * ppm;
      const ww = (grand ? 1.25 : basalt ? 0.55 : 0.95) * ppm;
      const wh = (grand ? 1.45 : basalt ? 0.8 : 1.2) * ppm;
      const bottom = top + fh - 0.55 * ppm;
      const wy = bottom - wh;
      const frame = 0.13 * ppm;

      // Gypsum frame, then the shutter/glass.
      d.fillStyle = '#efe7d6';
      d.fillRect(cx - ww / 2 - frame, wy - frame, ww + frame * 2, wh + frame * 2);
      d.fillStyle = '#1c1511';
      d.fillRect(cx - ww / 2, wy, ww, wh);
      d.strokeStyle = 'rgba(239,231,214,0.5)';
      d.lineWidth = Math.max(1, ppm / 30);
      d.beginPath();
      d.moveTo(cx, wy);
      d.lineTo(cx, wy + wh);
      d.stroke();

      const lit = rand() < (grand ? 0.95 : 0.65);
      if (lit) {
        const g = n.createLinearGradient(0, wy, 0, wy + wh);
        g.addColorStop(0, '#ffb24d');
        g.addColorStop(1, '#ff7a1f');
        n.fillStyle = g;
        n.globalAlpha = 0.55 + rand() * 0.45;
        n.fillRect(cx - ww / 2, wy, ww, wh);
        n.globalAlpha = 1;
      }

      if (basalt) continue;

      // Qamariya: a half-moon of coloured glass above the window.
      const r = (grand ? 0.72 : 0.5) * ppm;
      const fy = wy - frame - 0.06 * ppm;
      d.fillStyle = '#efe7d6';
      fanPath(d, cx, fy, r + frame, Math.PI, Math.PI * 2);
      d.fill();
      const segs = grand ? 7 : 5;
      for (let s = 0; s < segs; s++) {
        const a0 = Math.PI + (s / segs) * Math.PI;
        const a1 = Math.PI + ((s + 1) / segs) * Math.PI;
        const ci = Math.floor(rand() * QAMARIYA_DAY.length);
        d.fillStyle = QAMARIYA_DAY[ci];
        fanPath(d, cx, fy, r, a0 + 0.03, a1 - 0.03);
        d.fill();
        n.fillStyle = QAMARIYA_NIGHT[ci];
        fanPath(n, cx, fy, r, a0 + 0.03, a1 - 0.03);
        n.fill();
      }
      // Gypsum tracery ring inside the fan.
      d.strokeStyle = '#efe7d6';
      d.lineWidth = Math.max(1, ppm / 22);
      d.beginPath();
      d.arc(cx, fy, r * 0.42, Math.PI, Math.PI * 2);
      d.stroke();
      n.strokeStyle = '#000';
      n.lineWidth = Math.max(1, ppm / 22);
      n.beginPath();
      n.arc(cx, fy, r * 0.42, Math.PI, Math.PI * 2);
      n.stroke();
    }
  }

  const map = new THREE.CanvasTexture(day);
  const emissiveMap = new THREE.CanvasTexture(night);
  for (const t of [map, emissiveMap]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  return { map, emissiveMap };
}

/** Plain masonry for foundations and plinths. */
export function buildMasonry(widthM: number, heightM: number, seed: number, ppm: number, base = '#4a3f35') {
  const rand = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = Math.round(widthM * ppm);
  c.height = Math.round(heightM * ppm);
  drawStone(c.getContext('2d')!, 0, 0, c.width, c.height, base, ppm, rand);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export { FLOOR_H };
