// Entity spawning and short-lived visual effects. Nothing here draws; the world owns
// the state and the renderer owns the pixels.
import { FIELD, SHARD, NULL, HUES } from './config.js';

export function spawnShard(state, random, hueOverride) {
  if (state.shards.length >= SHARD.max) return;
  const fallback = random() < 0.62 ? Math.min(state.hueIndex, HUES.length - 1) : Math.floor(random() * HUES.length);
  const hue = Math.max(0, Math.min(HUES.length - 1, hueOverride ?? fallback));
  const angle = random() * Math.PI * 2;
  state.shards.push({
    x: 70 + random() * (FIELD.width - 140),
    y: 90 + random() * (FIELD.height - 190),
    vx: Math.cos(angle) * (12 + random() * 20),
    vy: Math.sin(angle) * (12 + random() * 20),
    hue, spin: random() * Math.PI * 2, life: SHARD.life, age: 0,
  });
}

export function spawnNull(state, random, difficulty) {
  if (state.nulls.length >= NULL.max) return;
  const edge = Math.floor(random() * 4);
  const margin = 40;
  let x = random() * FIELD.width;
  let y = random() * FIELD.height;
  if (edge === 0) { x = -margin; y = random() * FIELD.height; }
  else if (edge === 1) { x = FIELD.width + margin; y = random() * FIELD.height; }
  else if (edge === 2) { y = -margin; x = random() * FIELD.width; }
  else { y = FIELD.height + margin; x = random() * FIELD.width; }
  const speed = NULL.minSpeed + random() * (NULL.maxSpeed - NULL.minSpeed) + difficulty * 12;
  const toward = Math.atan2(FIELD.cy - y, FIELD.cx - x) + (random() - 0.5) * 1.4;
  const roll = random();
  const kind = difficulty >= 2 && roll < 0.30 ? 'splitter' : difficulty >= 1 && roll < 0.55 ? 'chaser' : 'drifter';
  state.nulls.push({
    x, y, vx: Math.cos(toward) * speed, vy: Math.sin(toward) * speed,
    kind, radius: NULL.radius * (kind === 'splitter' ? 1.18 : 1),
    wobble: random() * Math.PI * 2, speed,
  });
}

export function burstParticles(state, random, x, y, color, count, power) {
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const speed = power * (0.35 + random() * 0.9);
    state.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 0.45 + random() * 0.7, age: 0, size: 1.6 + random() * 3.2, color,
      kind: 'spark',
    });
  }
}

export function addRipple(state, x, y, color, max) {
  state.ripples.push({ x, y, color, radius: 8, max, age: 0, life: 0.65 });
}

export function updateEffects(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.age += dt;
    if (p.age >= p.life) { state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 1 - 1.8 * dt; p.vy *= 1 - 1.8 * dt;
  }
  for (let i = state.ripples.length - 1; i >= 0; i -= 1) {
    const r = state.ripples[i];
    r.age += dt;
    if (r.age >= r.life) { state.ripples.splice(i, 1); continue; }
    r.radius = 8 + (r.max - 8) * (r.age / r.life);
  }
}

export function driftShards(state, dt) {
  for (const s of state.shards) {
    s.age += dt; s.spin += dt * 1.7;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < 56 || s.x > FIELD.width - 56) s.vx *= -1;
    if (s.y < 82 || s.y > FIELD.height - 66) s.vy *= -1;
  }
}
