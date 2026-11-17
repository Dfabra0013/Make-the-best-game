// Fixed-capacity particle pool, shockwaves, callouts, afterimages and screen-shake decay.

import { clamp } from './mathutil.js';

export function createParticlePool(capacity = 660) {
  const slots = new Array(capacity);
  for (let i = 0; i < capacity; i++) {
    slots[i] = {
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      drag: 0.92,
      gravity: 0,
      color: '#ffffff',
      kind: 'spark',
      rotation: 0,
      spin: 0,
    };
  }
  return { slots, capacity, cursor: 0 };
}

function acquireParticleSlot(pool) {
  for (let attempt = 0; attempt < pool.capacity; attempt++) {
    const slot = pool.slots[pool.cursor];
    pool.cursor = (pool.cursor + 1) % pool.capacity;
    if (!slot.alive) return slot;
  }
  const recycled = pool.slots[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.capacity;
  return recycled;
}

export function emitBurstParticles(state, x, y, options = {}) {
  const pool = state.particlePool;
  if (!pool) return;
  const count = Math.round(options.count ?? 10);
  const colors = options.colors ?? ['#ffffff'];
  const speedMin = options.speedMin ?? 70;
  const speedMax = options.speedMax ?? 260;
  const lifeMin = options.lifeMin ?? 0.24;
  const lifeMax = options.lifeMax ?? 0.66;
  const sizeMin = options.sizeMin ?? 1.3;
  const sizeMax = options.sizeMax ?? 4.4;
  const baseAngle = typeof options.angle === 'number' ? options.angle : null;
  const spread = options.spread ?? Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const slot = acquireParticleSlot(pool);
    const angle = baseAngle === null ? state.rng() * Math.PI * 2 : baseAngle + (state.rng() - 0.5) * spread;
    const speed = speedMin + state.rng() * (speedMax - speedMin);
    slot.alive = true;
    slot.x = x;
    slot.y = y;
    slot.vx = Math.cos(angle) * speed + (options.driftX ?? 0);
    slot.vy = Math.sin(angle) * speed + (options.driftY ?? 0);
    slot.maxLife = lifeMin + state.rng() * (lifeMax - lifeMin);
    slot.life = slot.maxLife;
    slot.size = sizeMin + state.rng() * (sizeMax - sizeMin);
    slot.drag = options.drag ?? 0.9;
    slot.gravity = options.gravity ?? 0;
    slot.color = colors[Math.floor(state.rng() * colors.length)] ?? '#ffffff';
    slot.kind = options.kind ?? 'spark';
    slot.rotation = state.rng() * Math.PI * 2;
    slot.spin = (state.rng() - 0.5) * 9;
  }
}

export function emitShockwaveRing(state, x, y, options = {}) {
  state.shockwaves.push({
    x,
    y,
    radius: options.radiusStart ?? 6,
    maxRadius: options.radiusEnd ?? 90,
    life: options.life ?? 0.44,
    maxLife: options.life ?? 0.44,
    color: options.color ?? '#9ff3ff',
    width: options.width ?? 3.4,
  });
  if (state.shockwaves.length > 40) state.shockwaves.shift();
}

export function queueAfterimage(state, x, y, angle, color, options = {}) {
  state.afterimages.push({
    x,
    y,
    angle,
    color,
    life: options.life ?? 0.34,
    maxLife: options.life ?? 0.34,
    scale: options.scale ?? 1,
  });
  if (state.afterimages.length > 60) state.afterimages.shift();
}

export function updateVisualEffects(state, dt) {
  const pool = state.particlePool;
  if (pool) {
    for (let i = 0; i < pool.capacity; i++) {
      const slot = pool.slots[i];
      if (!slot.alive) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.alive = false;
        continue;
      }
      slot.x += slot.vx * dt;
      slot.y += slot.vy * dt;
      slot.vy += slot.gravity * dt;
      const dragFactor = Math.pow(slot.drag, dt * 60);
      slot.vx *= dragFactor;
      slot.vy *= dragFactor;
      slot.rotation += slot.spin * dt;
    }
  }

  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const ring = state.shockwaves[i];
    ring.life -= dt;
    const progress = 1 - clamp(ring.life / ring.maxLife, 0, 1);
    ring.radius = ring.radius + (ring.maxRadius - ring.radius) * Math.min(1, progress * 1.9 + dt * 3);
    if (ring.life <= 0) state.shockwaves.splice(i, 1);
  }

  for (let i = state.callouts.length - 1; i >= 0; i--) {
    const callout = state.callouts[i];
    callout.life -= dt;
    callout.y -= 34 * dt;
    if (callout.life <= 0) state.callouts.splice(i, 1);
  }

  for (let i = state.afterimages.length - 1; i >= 0; i--) {
    const ghost = state.afterimages[i];
    ghost.life -= dt;
    if (ghost.life <= 0) state.afterimages.splice(i, 1);
  }

  if (state.hitStopSec > 0) state.hitStopSec = Math.max(0, state.hitStopSec - dt);
  state.shakeTrauma = Math.max(0, state.shakeTrauma - dt * 1.85);
  const trauma = state.shakeTrauma * state.shakeTrauma;
  state.shakeOffsetX = (state.rng() - 0.5) * trauma * 26;
  state.shakeOffsetY = (state.rng() - 0.5) * trauma * 26;
}
