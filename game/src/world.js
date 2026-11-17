// Prismwake's rules and state: movement, spawning, collisions, scoring, hue
// restoration and the two endings. No drawing and no browser APIs live here.
import { FIELD, HUES, PLAYER, SHARD, NULL, REFRACT, DAWN, COMBO, SCORE, STEP } from './config.js';
import { spawnShard, spawnNull, burstParticles, addRipple, updateEffects, driftShards } from './spawn.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function createWorld(random, best) {
  const state = {
    player: { x: FIELD.cx, y: FIELD.cy + 90, vx: 0, vy: 0, angle: -Math.PI / 2, invuln: 0, dashTime: 0, dashCooldown: 0 },
    shards: [], nulls: [], particles: [], ripples: [],
    score: 0, best: best || 0, combo: 0, comboTime: 0,
    hueIndex: 0, hueProgress: 0, restored: [],
    refract: 34, integrity: PLAYER.maxIntegrity, elapsed: 0, dawn: DAWN,
    shardTimer: 0.4, nullTimer: 1.1,
    banner: '', bannerTime: 0, outcome: null, screen: 'title',
    shake: 0, flash: 0, muted: false,
    stats: { shards: 0, conversions: 0, refracts: 0, hits: 0, hues: 0 },
  };

  function announce(text, time = 2.2) { state.banner = text; state.bannerTime = time; }

  function reset() {
    const p = state.player;
    p.x = FIELD.cx; p.y = FIELD.cy + 90; p.vx = 0; p.vy = 0; p.angle = -Math.PI / 2;
    p.invuln = 0; p.dashTime = 0; p.dashCooldown = 0;
    state.shards.length = 0; state.nulls.length = 0;
    state.particles.length = 0; state.ripples.length = 0;
    state.score = 0; state.combo = 0; state.comboTime = 0;
    state.hueIndex = 0; state.hueProgress = 0; state.restored.length = 0;
    state.refract = 34; state.integrity = PLAYER.maxIntegrity;
    state.elapsed = 0; state.dawn = DAWN; state.shardTimer = 0.4; state.nullTimer = 1.1;
    state.banner = ''; state.bannerTime = 0; state.outcome = null; state.shake = 0; state.flash = 0;
    state.stats = { shards: 0, conversions: 0, refracts: 0, hits: 0, hues: 0 };
    for (let i = 0; i < 7; i += 1) spawnShard(state, random, i % HUES.length);
    announce('RESTORE THE FIVE HUES', 2.6);
  }

  function finish(outcome) {
    if (state.outcome) return;
    state.outcome = outcome;
    state.screen = outcome === 'victory' ? 'victory' : 'defeat';
    if (outcome === 'victory') {
      state.score += Math.floor(state.dawn) * SCORE.victoryPerSecond;
      for (let i = 0; i < 5; i += 1) burstParticles(state, random, FIELD.cx, FIELD.cy, HUES[i].hex, 26, 320);
      addRipple(state, FIELD.cx, FIELD.cy, '#ffffff', 720);
    } else {
      state.flash = 1;
    }
    if (state.score > state.best) state.best = state.score;
  }

  function restoreHue() {
    const index = state.hueIndex;
    state.restored.push(index);
    state.stats.hues += 1;
    state.hueProgress = 0;
    state.score += SCORE.hue;
    state.refract = Math.min(REFRACT.cost, state.refract + 30);
    state.flash = 0.7;
    addRipple(state, FIELD.cx, FIELD.cy, HUES[index].hex, 620);
    burstParticles(state, random, FIELD.cx, FIELD.cy, HUES[index].hex, 34, 260);
    announce(`${HUES[index].name} RESTORED  +${SCORE.hue}`, 2.4);
    state.hueIndex = index + 1;
    if (state.hueIndex >= HUES.length) finish('victory');
  }

  function collectShard(shard, events) {
    const onHue = shard.hue === state.hueIndex;
    state.combo = Math.min(COMBO.max, state.combo + 1);
    state.comboTime = COMBO.window;
    const gain = Math.round((onHue ? SCORE.shard : SCORE.offHue) * (1 + state.combo * 0.25));
    state.score += gain;
    state.stats.shards += 1;
    state.refract = Math.min(REFRACT.cost, state.refract + REFRACT.perShard);
    burstParticles(state, random, shard.x, shard.y, HUES[shard.hue].hex, onHue ? 9 : 5, 150);
    addRipple(state, shard.x, shard.y, HUES[shard.hue].hex, 44);
    if (onHue) {
      state.hueProgress += 1 / SHARD.perHue;
      if (state.hueProgress >= 1) {
        state.hueProgress = 1;
        events.restored = state.hueIndex;
        restoreHue();
      }
    }
    events.pickup = { hue: shard.hue, onHue };
    return gain;
  }

  function hurt(events) {
    const p = state.player;
    if (p.invuln > 0 || state.outcome) return;
    state.integrity -= 1;
    state.stats.hits += 1;
    state.combo = 0; state.comboTime = 0;
    p.invuln = PLAYER.invulnerable;
    state.shake = 1; state.flash = 0.5;
    burstParticles(state, random, p.x, p.y, '#ff5470', 22, 230);
    addRipple(state, p.x, p.y, '#ff5470', 120);
    events.hurt = true;
    if (state.integrity <= 0) finish('defeat');
  }

  function triggerRefract(events) {
    if (state.refract < REFRACT.cost || state.outcome) return false;
    state.refract = 0;
    state.stats.refracts += 1;
    const p = state.player;
    let converted = 0;
    for (let i = state.nulls.length - 1; i >= 0; i -= 1) {
      const n = state.nulls[i];
      const dx = n.x - p.x, dy = n.y - p.y;
      if (dx * dx + dy * dy > REFRACT.radius * REFRACT.radius) continue;
      state.nulls.splice(i, 1);
      converted += 1;
      burstParticles(state, random, n.x, n.y, HUES[state.hueIndex].hex, 12, 210);
      if (n.kind === 'splitter' && state.restored.length >= 2) {
        for (let k = 0; k < 2; k += 1) {
          const a = random() * Math.PI * 2;
          state.nulls.push({
            x: n.x, y: n.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110,
            kind: 'drifter', radius: NULL.radius * 0.72, wobble: random() * 6, speed: 110,
          });
        }
      } else {
        spawnShard(state, random, state.hueIndex);
      }
    }
    state.score += converted * SCORE.conversion;
    state.refract = Math.min(REFRACT.cost, converted * REFRACT.perConversion);
    state.combo = Math.min(COMBO.max, state.combo + converted);
    state.comboTime = COMBO.window;
    addRipple(state, p.x, p.y, HUES[state.hueIndex].hex, REFRACT.radius);
    burstParticles(state, random, p.x, p.y, '#ffffff', 26, 300);
    state.flash = 0.35;
    events.refract = { converted };
    return true;
  }

  function step(dt, input, audio) {
    const events = {};
    const p = state.player;
    state.elapsed += dt;
    state.dawn = Math.max(0, DAWN - state.elapsed);
    if (state.bannerTime > 0) state.bannerTime = Math.max(0, state.bannerTime - dt);
    if (state.comboTime > 0) { state.comboTime -= dt; if (state.comboTime <= 0) state.combo = 0; }
    state.shake = Math.max(0, state.shake - dt * 2.6);
    state.flash = Math.max(0, state.flash - dt * 2.2);
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
    if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - dt);

    // Steering: keyboard wins, otherwise the skimmer eases toward the pointer.
    const dir = input.direction();
    let tx = 0, ty = 0;
    if (dir.x || dir.y) { tx = dir.x * PLAYER.speed; ty = dir.y * PLAYER.speed; }
    else if (input.pointer.active) {
      tx = clamp((input.pointer.x - p.x) * PLAYER.accel, -PLAYER.speed, PLAYER.speed);
      ty = clamp((input.pointer.y - p.y) * PLAYER.accel, -PLAYER.speed, PLAYER.speed);
    }
    p.vx += (tx - p.vx) * Math.min(1, dt * 11);
    p.vy += (ty - p.vy) * Math.min(1, dt * 11);
    if (p.dashTime > 0) p.dashTime = Math.max(0, p.dashTime - dt);
    p.x = clamp(p.x + p.vx * dt, 40, FIELD.width - 40);
    p.y = clamp(p.y + p.vy * dt, 76, FIELD.height - 56);
    p.angle = Math.atan2(p.vy, p.vx);

    const difficulty = state.restored.length;
    state.shardTimer -= dt;
    if (state.shardTimer <= 0) { spawnShard(state, random); state.shardTimer += SHARD.interval; }
    state.nullTimer -= dt;
    if (state.nullTimer <= 0) {
      spawnNull(state, random, difficulty);
      state.nullTimer += Math.max(0.42, NULL.interval - difficulty * 0.13);
    }
    driftShards(state, dt);
    updateEffects(state, dt);

    // Nulls: drifters coast, chasers lean toward the skimmer, splitters lumber.
    for (let i = state.nulls.length - 1; i >= 0; i -= 1) {
      const n = state.nulls[i];
      n.wobble += dt * 2.2;
      if (n.kind === 'chaser' && difficulty >= NULL.chaseLevel) {
        const a = Math.atan2(p.y - n.y, p.x - n.x);
        n.vx += (Math.cos(a) * n.speed - n.vx) * dt * 0.9;
        n.vy += (Math.sin(a) * n.speed - n.vy) * dt * 0.9;
      }
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -70 || n.x > FIELD.width + 70) n.vx *= -1;
      if (n.y < -70 || n.y > FIELD.height + 70) n.vy *= -1;
      const dx = n.x - p.x, dy = n.y - p.y;
      const rr = (n.radius + PLAYER.radius) * 0.82;
      if (dx * dx + dy * dy < rr * rr) hurt(events);
    }

    // Shard pickups.
    for (let i = state.shards.length - 1; i >= 0; i -= 1) {
      const s = state.shards[i];
      const dx = s.x - p.x, dy = s.y - p.y;
      const rr = SHARD.radius + PLAYER.radius;
      if (dx * dx + dy * dy < rr * rr) {
        state.shards.splice(i, 1);
        collectShard(s, events);
      } else if (s.age > s.life) {
        state.shards.splice(i, 1);
      }
    }

    if (state.dawn <= 0 && !state.outcome) finish('defeat');
    return events;
  }

  function dash() {
    const p = state.player;
    if (p.dashCooldown > 0 || state.outcome) return false;
    let ax = p.vx, ay = p.vy;
    const len = Math.hypot(ax, ay);
    if (len < 30) { ax = Math.cos(p.angle); ay = Math.sin(p.angle); }
    else { ax /= len; ay /= len; }
    p.vx = ax * PLAYER.dashSpeed; p.vy = ay * PLAYER.dashSpeed;
    p.dashTime = PLAYER.dashTime; p.dashCooldown = PLAYER.dashCooldown;
    burstParticles(state, random, p.x, p.y, HUES[state.hueIndex].hex, 16, 190);
    addRipple(state, p.x, p.y, HUES[state.hueIndex].hex, 70);
    return true;
  }

  reset();
  return { state, reset, step, triggerRefract, dash, finish, announce, _internal: { restoreHue, collectShard } };
}
