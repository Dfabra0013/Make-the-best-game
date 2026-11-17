// Six hostile archetypes, three multi-phase Act Bosses, wave budgets and squadron steering.

import { ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_RADIUS, WAVE_SCHEDULE, realmForWave } from './config.js';
import { angleTo, distanceBetween, pickRandom } from './mathutil.js';
import { emitBurstParticles, emitShockwaveRing } from './particles.js';
import { spawnArenaProjectile } from './projectiles.js';
import { announceBanner } from './state.js';
import { playBossAlarm } from './audio.js';

export const ENEMY_ARCHETYPES = {
  drifter: { label: 'Drifter', cost: 1, hp: 24, radius: 15, speed: 104, contactDamage: 10, fireInterval: 0, score: 70, shards: 1, color: '#ffd166', shape: 'tri' },
  lancer: { label: 'Lancer', cost: 2, hp: 48, radius: 18, speed: 168, contactDamage: 15, fireInterval: 1.9, score: 120, shards: 1, color: '#ff8f5a', shape: 'arrow' },
  sniper: { label: 'Sniper', cost: 2, hp: 36, radius: 17, speed: 74, contactDamage: 12, fireInterval: 2.0, score: 140, shards: 1, color: '#9be8ff', shape: 'diamond' },
  splitter: { label: 'Splitter', cost: 3, hp: 86, radius: 25, speed: 78, contactDamage: 16, fireInterval: 2.0, score: 210, shards: 2, color: '#c77dff', shape: 'hex' },
  warden: { label: 'Warden', cost: 4, hp: 158, radius: 30, speed: 58, contactDamage: 20, fireInterval: 1.5, score: 330, shards: 3, color: '#7cffb2', shape: 'ring' },
  obelisk: { label: 'Obelisk', cost: 5, hp: 244, radius: 34, speed: 38, contactDamage: 24, fireInterval: 1.25, score: 460, shards: 4, color: '#ff5d8f', shape: 'obelisk' },
};

export const ACT_BOSSES = {
  'helios-centurion': { name: 'HELIOS CENTURION', title: 'Guardian of the Sundial', hp: 1500, radius: 52, color: '#ffc04d', accent: '#ff7a3d', score: 5600, shards: 16 },
  'paradox-weaver': { name: 'PARADOX WEAVER', title: 'Loom of the Violet Orrery', hp: 2450, radius: 56, color: '#ff6fd8', accent: '#7ef0ff', score: 8400, shards: 20 },
  'kronos-sundered': { name: 'KRONOS, THE SUNDERED', title: 'Sovereign of the Eclipse', hp: 3600, radius: 62, color: '#ff4769', accent: '#ffcb47', score: 13200, shards: 26 },
};

const INTRO_SPAWN_RADIUS = 292;

function spawnPointOnRing(state, radius = INTRO_SPAWN_RADIUS) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = state.rng() * Math.PI * 2;
    const x = ARENA_CENTER_X + Math.cos(angle) * radius;
    const y = ARENA_CENTER_Y + Math.sin(angle) * radius;
    if (distanceBetween(x, y, state.player.x, state.player.y) > 190) return { x, y };
  }
  return { x: ARENA_CENTER_X, y: ARENA_CENTER_Y - radius };
}

export function createEnemy(state, type, position) {
  const archetype = ENEMY_ARCHETYPES[type] ?? ENEMY_ARCHETYPES.drifter;
  const scale = state.wave <= 9 ? 1 + (state.wave - 1) * 0.06 : 1 + (state.wave - 1) * 0.115;
  const hp = Math.round(archetype.hp * scale);
  return {
    id: state.nextEntityId++,
    type,
    label: archetype.label,
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    radius: archetype.radius,
    hp,
    maxHp: hp,
    speed: archetype.speed,
    contactDamage: archetype.contactDamage,
    fireInterval: archetype.fireInterval,
    fireTimer: 0.5 + state.rng() * 1.2,
    score: archetype.score,
    shardCount: archetype.shards,
    color: archetype.color,
    shape: archetype.shape,
    flashSec: 0,
    spawnGraceSec: 0.45,
    orbitDir: state.rng() > 0.5 ? 1 : -1,
    phase: state.rng() * Math.PI * 2,
    lungeTimer: 1.4 + state.rng() * 1.2,
    lungeActiveSec: 0,
    isBoss: false,
    bossId: null,
  };
}

function scheduleEntryForWave(waveNumber) {
  const scheduled = WAVE_SCHEDULE.find((entry) => entry.wave === waveNumber);
  if (scheduled) return scheduled;
  return {
    wave: waveNumber,
    title: 'Endless Orbit',
    budget: 28 + (waveNumber - 9) * 5,
    types: ['drifter', 'lancer', 'sniper', 'splitter', 'warden', 'obelisk'],
    bossId: waveNumber % 3 === 0 ? 'kronos-sundered' : null,
  };
}

export function spawnWaveEncounter(state) {
  const entry = scheduleEntryForWave(state.wave);
  state.realm = realmForWave(state.wave);
  state.spawnQueue = [];
  state.waveSpawnClock = 0;
  state.waveClearTimer = 0;

  let budget = entry.budget;
  let elapsed = 0.45;
  while (budget > 0) {
    const affordable = entry.types.filter((type) => ENEMY_ARCHETYPES[type].cost <= budget);
    const type = affordable.length > 0 ? pickRandom(state.rng, affordable) : 'drifter';
    budget -= ENEMY_ARCHETYPES[type].cost;
    state.spawnQueue.push({ type, delay: elapsed });
    elapsed += 0.24 + state.rng() * 0.38;
  }
  if (entry.bossId) {
    state.spawnQueue.push({ type: 'boss', bossId: entry.bossId, delay: 1.15 });
    announceBanner(state, `WAVE ${state.wave} · BOSS`, entry.title, ACT_BOSSES[entry.bossId].color, 3.0);
  } else {
    announceBanner(state, `WAVE ${state.wave} / 9`, entry.title, state.realm.ringPrimary, 2.6);
  }
  return entry;
}

export function spawnActBoss(state, bossId) {
  const def = ACT_BOSSES[bossId];
  if (!def) return null;
  const hp = Math.round(def.hp * (state.endlessMode ? 1 + Math.max(0, state.wave - 9) * 0.22 : 1));
  const boss = {
    id: state.nextEntityId++,
    type: 'boss',
    label: def.name,
    x: ARENA_CENTER_X,
    y: ARENA_CENTER_Y - 150,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp,
    maxHp: hp,
    speed: 74,
    contactDamage: 26,
    fireInterval: 0,
    fireTimer: 0,
    score: def.score,
    shardCount: def.shards,
    color: def.color,
    accent: def.accent,
    shape: 'boss',
    flashSec: 0,
    spawnGraceSec: 1.4,
    orbitDir: 1,
    phase: 0,
    isBoss: true,
    bossId,
    bossName: def.name,
    bossTitle: def.title,
    phaseIndex: 0,
    attackTimer: 1.4,
    attackIndex: 0,
    telegraphSec: 0,
    telegraphAngle: 0,
    spiralAngle: 0,
    burstCount: 0,
    burstTimer: 0,
    orbitAngle: state.rng() * Math.PI * 2,
    summonFlags: 0,
  };
  state.enemies.push(boss);
  emitShockwaveRing(state, boss.x, boss.y, { radiusEnd: 300, color: def.accent, life: 0.9, width: 6 });
  emitBurstParticles(state, boss.x, boss.y, {
    count: 46,
    colors: [def.color, def.accent, '#ffffff'],
    speedMin: 80,
    speedMax: 420,
    lifeMin: 0.3,
    lifeMax: 0.9,
    sizeMin: 1.4,
    sizeMax: 5,
  });
  state.shakeTrauma = 1;
  playBossAlarm(state.audio);
  announceBanner(state, def.name, def.title, def.color, 3.2);
  return boss;
}

function fire(state, enemy, angle, speed, damage, color, radius = 5, length = 12) {
  spawnArenaProjectile(state, {
    x: enemy.x + Math.cos(angle) * (enemy.radius + 4),
    y: enemy.y + Math.sin(angle) * (enemy.radius + 4),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    damage,
    friendly: false,
    color,
    kind: 'enemy',
    life: 4.2,
    source: enemy.isBoss ? 'boss' : 'enemy',
    length,
  });
}

function fireFan(state, enemy, facing, count, spread, speed, damage, color, radius = 5, length = 12) {
  for (let i = 0; i < count; i++) {
    fire(state, enemy, facing + (i - (count - 1) / 2) * spread, speed, damage, color, radius, length);
  }
}

function fireRing(state, enemy, count, offset, speed, damage, color, radius = 5, length = 12) {
  for (let i = 0; i < count; i++) fire(state, enemy, offset + (i / count) * Math.PI * 2, speed, damage, color, radius, length);
}

function moveStandardEnemy(state, enemy, dt) {
  const player = state.player;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const dirX = dx / distance;
  const dirY = dy / distance;

  if (enemy.type === 'drifter') {
    enemy.vx += dirX * 320 * dt;
    enemy.vy += dirY * 320 * dt;
  } else if (enemy.type === 'lancer') {
    enemy.lungeTimer -= dt;
    if (enemy.lungeTimer <= 0) {
      enemy.lungeActiveSec = 0.55;
      enemy.lungeTimer = 2.2 + state.rng() * 1.1;
      enemy.vx = dirX * enemy.speed * 2.4;
      enemy.vy = dirY * enemy.speed * 2.4;
    }
    enemy.lungeActiveSec = Math.max(0, enemy.lungeActiveSec - dt);
    if (enemy.lungeActiveSec <= 0) {
      enemy.vx += dirX * 180 * dt;
      enemy.vy += dirY * 180 * dt;
    }
  } else {
    const band = enemy.type === 'sniper' ? 330 : enemy.type === 'warden' ? 245 : 0;
    const push = band === 0 ? 1 : distance > band ? 1 : -0.7;
    const thrust = enemy.type === 'obelisk' ? 90 : enemy.type === 'splitter' ? 190 : 150;
    const strafe = enemy.type === 'sniper' ? 90 : 140;
    enemy.vx += (dirX * thrust * push - dirY * strafe * enemy.orbitDir) * dt;
    enemy.vy += (dirY * thrust * push + dirX * strafe * enemy.orbitDir) * dt;
  }

  enemy.vx *= 1 - Math.min(0.95, 3.4 * dt);
  enemy.vy *= 1 - Math.min(0.95, 3.4 * dt);
  const speed = Math.hypot(enemy.vx, enemy.vy);
  const maxSpeed = enemy.type === 'lancer' && enemy.lungeActiveSec > 0 ? enemy.speed * 2.6 : enemy.speed;
  if (speed > maxSpeed) {
    enemy.vx = (enemy.vx / speed) * maxSpeed;
    enemy.vy = (enemy.vy / speed) * maxSpeed;
  }
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  const fromX = enemy.x - ARENA_CENTER_X;
  const fromY = enemy.y - ARENA_CENTER_Y;
  const fromCenter = Math.hypot(fromX, fromY);
  const limit = ARENA_RADIUS - enemy.radius - 2;
  if (fromCenter > limit) {
    enemy.x = ARENA_CENTER_X + (fromX / fromCenter) * limit;
    enemy.y = ARENA_CENTER_Y + (fromY / fromCenter) * limit;
    enemy.vx *= -0.4;
    enemy.vy *= -0.4;
  }

  if (enemy.spawnGraceSec > 0) {
    enemy.spawnGraceSec -= dt;
    return;
  }
  if (enemy.fireInterval <= 0) return;

  enemy.fireTimer -= dt;
  if (enemy.fireTimer > 0) return;
  enemy.fireTimer = enemy.fireInterval;
  const facing = angleTo(enemy.x, enemy.y, player.x, player.y);

  if (enemy.type === 'sniper') {
    fire(state, enemy, facing, 430, 13, '#bff2ff', 5.4, 22);
  } else if (enemy.type === 'warden') {
    fireFan(state, enemy, facing, 5, 0.16, 260, 9, '#9cffcf');
  } else if (enemy.type === 'obelisk') {
    enemy.phase += 0.62;
    fireRing(state, enemy, 3, enemy.phase, 210, 11, '#ff8fb0', 5.6);
  } else if (enemy.type === 'splitter') {
    fireFan(state, enemy, facing, 3, 0.22, 240, 9, '#d9a6ff', 4.6, 10);
  } else {
    fire(state, enemy, facing, 250, 10, '#ffd8a8', 4.8, 10);
  }
}

function spawnBossAdds(state, boss, types) {
  for (const type of types) {
    const add = createEnemy(state, type, spawnPointOnRing(state, 250));
    add.spawnGraceSec = 0.3;
    state.enemies.push(add);
  }
  emitShockwaveRing(state, boss.x, boss.y, { radiusEnd: 210, color: boss.accent, life: 0.6, width: 4 });
}

function runBossBurst(state, boss, dt) {
  if (boss.burstCount <= 0) return;
  boss.burstTimer -= dt;
  if (boss.burstTimer > 0) return;
  boss.burstCount -= 1;
  boss.burstTimer = 0.12;
  if (boss.bossId === 'kronos-sundered') {
    fire(state, boss, boss.telegraphAngle, 620, 18, boss.accent, 7, 34);
    fireFan(state, boss, boss.telegraphAngle, 2, 0.18, 560, 12, boss.color, 5, 22);
  } else if (boss.bossId === 'paradox-weaver') {
    boss.spiralAngle += 0.44;
    fire(state, boss, boss.spiralAngle, 300, 12, boss.color, 5.6, 14);
    fire(state, boss, boss.spiralAngle + Math.PI, 300, 12, boss.accent, 5.6, 14);
    if (boss.phaseIndex >= 1) fire(state, boss, boss.spiralAngle + Math.PI / 2, 260, 10, boss.color, 5, 12);
  } else {
    fire(state, boss, angleTo(boss.x, boss.y, state.player.x, state.player.y) + (boss.burstCount - 2) * 0.16, 470, 14, boss.accent, 5.6, 24);
  }
}

export function updateBossBehavior(state, boss, dt) {
  const healthRatio = boss.hp / boss.maxHp;
  boss.phaseIndex = healthRatio > 0.66 ? 0 : healthRatio > 0.33 ? 1 : 2;
  boss.spawnGraceSec = Math.max(0, boss.spawnGraceSec - dt);
  boss.telegraphSec = Math.max(0, boss.telegraphSec - dt);

  boss.orbitAngle += dt * (0.42 + boss.phaseIndex * 0.16);
  const targetX = ARENA_CENTER_X + Math.cos(boss.orbitAngle) * 168;
  const targetY = ARENA_CENTER_Y + Math.sin(boss.orbitAngle * 0.8 - 1.2) * 132;
  boss.vx += (targetX - boss.x) * 0.9 * dt;
  boss.vy += (targetY - boss.y) * 0.9 * dt;
  boss.vx *= 1 - Math.min(0.9, 2.4 * dt);
  boss.vy *= 1 - Math.min(0.9, 2.4 * dt);
  boss.x += boss.vx * dt;
  boss.y += boss.vy * dt;
  if (boss.spawnGraceSec > 0) return;

  runBossBurst(state, boss, dt);
  boss.attackTimer -= dt;
  if (boss.attackTimer > 0) return;

  const attack = boss.attackIndex;
  const facing = angleTo(boss.x, boss.y, state.player.x, state.player.y);
  boss.attackIndex = (boss.attackIndex + 1) % 4;

  if (boss.bossId === 'helios-centurion') {
    if (attack === 0) {
      fireRing(state, boss, 14 + boss.phaseIndex * 4, boss.orbitAngle, 265, 12, boss.color, 5.4);
      boss.attackTimer = 2.0 - boss.phaseIndex * 0.24;
    } else if (attack === 1) {
      boss.burstCount = 3;
      boss.attackTimer = 1.7;
    } else if (attack === 2) {
      spawnBossAdds(state, boss, boss.phaseIndex >= 2 ? ['lancer', 'lancer', 'drifter'] : ['drifter', 'drifter']);
      boss.attackTimer = 2.4;
    } else {
      boss.telegraphAngle = facing;
      boss.telegraphSec = 0.55;
      boss.burstCount = 5;
      boss.burstTimer = 0.5;
      boss.attackTimer = 2.1;
    }
    return;
  }

  if (boss.bossId === 'paradox-weaver') {
    if (attack === 0) {
      boss.burstCount = 16 + boss.phaseIndex * 6;
      boss.attackTimer = 2.3;
    } else if (attack === 1) {
      fireFan(state, boss, facing, 7, 0.15, 340, 11, boss.color, 5, 14);
      boss.attackTimer = 1.5;
    } else if (attack === 2) {
      boss.x = ARENA_CENTER_X + Math.cos(state.rng() * Math.PI * 2) * 180;
      boss.y = ARENA_CENTER_Y + Math.sin(state.rng() * Math.PI * 2) * 180;
      emitBurstParticles(state, boss.x, boss.y, {
        count: 26,
        colors: [boss.color, boss.accent, '#ffffff'],
        speedMin: 60,
        speedMax: 320,
        lifeMin: 0.2,
        lifeMax: 0.7,
      });
      boss.attackTimer = 1.2;
    } else {
      spawnBossAdds(state, boss, ['splitter', 'sniper']);
      boss.attackTimer = 2.6;
    }
    return;
  }

  if (attack === 0) {
    boss.telegraphAngle = facing;
    boss.telegraphSec = 0.8;
    boss.burstCount = 9;
    boss.burstTimer = 0.82;
    boss.attackTimer = 2.6;
  } else if (attack === 1) {
    fireRing(state, boss, 20, boss.orbitAngle * 1.6, 220, 10, boss.color, 5, 12);
    boss.attackTimer = 2.1;
  } else if (attack === 2) {
    if (boss.phaseIndex >= 1 && boss.summonFlags < 2) {
      boss.summonFlags += 1;
      spawnBossAdds(state, boss, ['obelisk', 'warden']);
    } else {
      spawnBossAdds(state, boss, ['drifter', 'lancer', 'drifter']);
    }
    boss.attackTimer = 2.8;
  } else {
    boss.burstCount = 6;
    boss.attackTimer = 2.0;
  }
}

export function updateEnemySquadrons(state, dt) {
  state.waveSpawnClock += dt;
  for (let i = state.spawnQueue.length - 1; i >= 0; i--) {
    const pending = state.spawnQueue[i];
    if (pending.delay > state.waveSpawnClock) continue;
    state.spawnQueue.splice(i, 1);
    if (pending.type === 'boss') {
      spawnActBoss(state, pending.bossId);
      continue;
    }
    if (state.enemies.length >= 34) continue;
    const position = spawnPointOnRing(state);
    const enemy = createEnemy(state, pending.type, position);
    state.enemies.push(enemy);
    emitBurstParticles(state, position.x, position.y, {
      count: 8,
      colors: [enemy.color, '#ffffff'],
      speedMin: 30,
      speedMax: 150,
      lifeMin: 0.16,
      lifeMax: 0.42,
      sizeMin: 1,
      sizeMax: 2.6,
    });
  }

  for (const enemy of state.enemies) {
    enemy.flashSec = Math.max(0, enemy.flashSec - dt);
    if (enemy.hp <= 0) continue;
    if (enemy.isBoss) updateBossBehavior(state, enemy, dt);
    else moveStandardEnemy(state, enemy, dt);
  }

  for (let i = 0; i < state.enemies.length; i++) {
    for (let j = i + 1; j < state.enemies.length; j++) {
      const a = state.enemies[i];
      const b = state.enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minimum = a.radius + b.radius;
      const distance = Math.hypot(dx, dy);
      if (distance <= 0 || distance >= minimum) continue;
      const push = ((minimum - distance) / distance) * 0.5;
      const weightA = a.isBoss ? 0.1 : 1;
      const weightB = b.isBoss ? 0.1 : 1;
      a.x -= dx * push * weightA;
      a.y -= dy * push * weightA;
      b.x += dx * push * weightB;
      b.y += dy * push * weightB;
    }
  }
}
