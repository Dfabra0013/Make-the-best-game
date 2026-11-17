// The meadow's weather: pollen drifting over the field, sparks shaken loose by a
// dash, rings from a lantern flare, dust where a hound lands. One pool for all
// of it, drawn additively so the light in the scene builds up instead of
// covering what is under it.

import { TAU, clamp } from './draw.js';

const MAX_PARTICLES = 900;

export class ParticleField {
  constructor(rng) {
    this.rng = rng;
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  get count() {
    return this.items.length;
  }

  /** Pushes one particle, dropping it when the pool is full. */
  add(p) {
    if (this.items.length >= MAX_PARTICLES) return;
    this.items.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0.6,
      age: 0,
      size: 2,
      color: '#ffd9a0',
      alpha: 1,
      drag: 3,
      gravity: 0,
      kind: 'dot',
      grow: 0,
      spin: 0,
      ...p,
    });
  }

  /** A scattering of sparks, as when a wisp goes home. */
  burst(x, y, opts = {}) {
    const { count = 14, color = '#ffe3a8', speed = 150, size = 2.4, life = 0.7, spread = TAU, angle = 0 } = opts;
    for (let i = 0; i < count; i += 1) {
      const dir = angle + this.rng.range(-spread / 2, spread / 2);
      const v = speed * this.rng.range(0.35, 1);
      this.add({
        x,
        y,
        vx: Math.cos(dir) * v,
        vy: Math.sin(dir) * v,
        life: life * this.rng.range(0.6, 1.2),
        size: size * this.rng.range(0.6, 1.3),
        color,
        drag: 2.4,
        kind: 'spark',
      });
    }
  }

  /** A ring that swells and fades: a flare, a delivery, a hound's landing. */
  ring(x, y, opts = {}) {
    const { color = '#ffcf87', size = 70, life = 0.55, grow = 340, alpha = 0.7, width = 3 } = opts;
    this.add({ x, y, life, size, color, alpha, kind: 'ring', grow, spin: width });
  }

  /** Soft motes drifting up, used for the Hollow and for wisps in the light. */
  motes(x, y, opts = {}) {
    const { count = 3, color = '#ffe0ab', size = 2, life = 1.4, speed = 26, rise = 40 } = opts;
    for (let i = 0; i < count; i += 1) {
      this.add({
        x: x + this.rng.range(-8, 8),
        y: y + this.rng.range(-6, 6),
        vx: this.rng.range(-speed, speed),
        vy: -rise * this.rng.range(0.4, 1),
        life: life * this.rng.range(0.7, 1.2),
        size: size * this.rng.range(0.7, 1.3),
        color,
        drag: 1.2,
        kind: 'dot',
      });
    }
  }

  /** A puff of ground dust. */
  puff(x, y, opts = {}) {
    const { count = 5, color = '#8a7a9c', size = 7, life = 0.5 } = opts;
    for (let i = 0; i < count; i += 1) {
      this.add({
        x: x + this.rng.range(-6, 6),
        y: y + this.rng.range(-4, 4),
        vx: this.rng.range(-90, 90),
        vy: this.rng.range(-70, -20),
        life: life * this.rng.range(0.6, 1.2),
        size: size * this.rng.range(0.6, 1.2),
        color,
        alpha: 0.35,
        drag: 3.2,
        kind: 'dot',
      });
    }
  }

  /** A short-lived trail behind a moving light. */
  trail(x, y, color, size = 2, life = 0.32) {
    this.add({ x, y, vx: 0, vy: 0, life, size, color, alpha: 0.55, drag: 4, kind: 'dot' });
  }

  update(dt) {
    const keep = [];
    for (const p of this.items) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'ring') p.size += p.grow * dt;
      keep.push(p);
    }
    this.items = keep;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const t = p.age / p.life;
      const fade = clamp(1 - t, 0, 1);
      if (p.kind === 'ring') {
        ctx.globalAlpha = fade * fade * p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.6, p.spin * fade);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = fade * p.alpha;
      ctx.fillStyle = p.color;
      const r = p.kind === 'spark' ? p.size * (0.4 + fade * 0.8) : p.size * (0.6 + fade * 0.6);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, r), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
