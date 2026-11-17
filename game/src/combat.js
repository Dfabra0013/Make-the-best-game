// Astrolabe Prism refraction, projectile integration, hit resolution and Chrono-Shard pickup.

import { ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_RADIUS, GAME_CONFIG } from './config.js';
import { angleTo, clamp, distanceBetween } from './mathutil.js';
import { emitBurstParticles, emitShockwaveRing } from './particles.js';
import { advanceProjectileMotion, projectileOutsideArena, spawnArenaProjectile } from './projectiles.js';
import { applyDamageToPlayer } from './player.js';
import { awardScore, bumpCombo } from './state.js';
import { playImpactSynth, playShardPickup } from './audio.js';
import { createEnemy } from './enemies.js';

export function spawnFloatingCallout(state, x, y, text, color = '#ffffff', size = 18) {
  state.callouts.push({
    x,
    y,
    text,
    color,
    life: 0.85,
    maxLife: 0.85,
    size,
  });
  if (state.callouts.length > 26) state.callouts.shift();
}

export function spawnShards(state, x, y, count, value) {
  for (let i = 0; i < count; i++) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 60 + state.rng() * 150;
    state.shards.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      value,
      life: 13,
      spin: state.rng() * Math.PI * 2,
      spinSpeed: 2.4 + state.rng() * 2.4,
      size: 7.2 + state.rng() * 3,
    });
  }
}

export function buildRealmPrisms(state) {
  const realm = state.realm;
  const count = realm.prismCount + (state.player.chassis.id === 'astraea-prism' ? 1 : 0);
  const prisms = [];
  for (let i = 0; i < count; i++) {
    prisms.push({
      id: state.nextEntityId++,
      angle: (i / count) * Math.PI * 2,
      orbitRadius: realm.prismOrbitRadius + (i % 2 === 0 ? 0 : 34),
      spin: (i % 2 === 0 ? 1 : -1) * (0.24 + i * 0.05),
      radius: 28,
      x: ARENA_CENTER_X,
      y: ARENA_CENTER_Y,
      flashSec: 0,
      pulse: state.rng() * Math.PI * 2,
    });
  }
  state.prisms = prisms;
  return prisms;
}

export function updateProjectilesAndPrisms(state, dt, modifiers) {
  for (const prism of state.prisms) {
    prism.angle += prism.spin * dt;
    prism.pulse += dt * 2.4;
    prism.x = ARENA_CENTER_X + Math.cos(prism.angle) * prism.orbitRadius;
    prism.y = ARENA_CENTER_Y + Math.sin(prism.angle) * prism.orbitRadius * 0.86;
    prism.flashSec = Math.max(0, prism.flashSec - dt);
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const projectile = state.projectiles[i];
    advanceProjectileMotion(projectile, dt);

    if (projectile.friendly && projectile.refractions < 2) {
      for (const prism of state.prisms) {
        if (distanceBetween(projectile.x, projectile.y, prism.x, prism.y) > prism.radius + projectile.radius) {
          continue;
        }
        const target = nearestEnemy(state, projectile.x, projectile.y, 640);
        if (!target) continue;
        const prismPower = state.player.chassis.prismBonusDamage * modifiers.prismDamageMul;
        const angle = angleTo(prism.x, prism.y, target.x, target.y);
        const speed = Math.max(420, Math.hypot(projectile.vx, projectile.vy) * 1.12);
        projectile.x = prism.x;
        projectile.y = prism.y;
        projectile.vx = Math.cos(angle) * speed;
        projectile.vy = Math.sin(angle) * speed;
        projectile.damage *= prismPower;
        projectile.color = state.realm.prismColor;
        projectile.refractions += 1;
        projectile.radius *= 1.06;
        prism.flashSec = 0.3;
        state.stats.prismRicochets += 1;
        emitShockwaveRing(state, prism.x, prism.y, {
          radiusEnd: 74,
          color: state.realm.prismColor,
          life: 0.34,
          width: 3,
        });
        emitBurstParticles(state, prism.x, prism.y, {
          count: 8,
          colors: [state.realm.prismColor, '#ffffff'],
          speedMin: 40,
          speedMax: 190,
          lifeMin: 0.14,
          lifeMax: 0.4,
          sizeMin: 1,
          sizeMax: 2.8,
        });
        break;
      }
    }

    if (projectileOutsideArena(projectile)) {
      state.projectiles.splice(i, 1);
    }
  }
}

function nearestEnemy(state, x, y, maxDistance) {
  let closest = null;
  let closestDistance = maxDistance;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const distance = distanceBetween(x, y, enemy.x, enemy.y) - enemy.radius;
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = enemy;
    }
  }
  return closest;
}

export function resolveArenaCollisions(state, dt, modifiers) {
  const player = state.player;
  const playerRadius = player.radius;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const projectile = state.projectiles[i];
    if (!projectile) continue;

    if (projectile.friendly) {
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        const reach = enemy.radius + projectile.radius;
        if (distanceBetween(projectile.x, projectile.y, enemy.x, enemy.y) > reach) continue;

        damageEnemy(state, enemy, projectile.damage, projectile, modifiers);
        if (projectile.aoe > 0) {
          explodeProjectile(state, projectile, modifiers);
        }
        if (projectile.pierce > 0) {
          projectile.pierce -= 1;
          projectile.damage *= 0.86;
        } else {
          state.projectiles.splice(i, 1);
        }
        break;
      }
      continue;
    }

    const distanceToPlayer = distanceBetween(projectile.x, projectile.y, player.x, player.y);
    if (distanceToPlayer < playerRadius + projectile.radius) {
      if (applyDamageToPlayer(state, projectile.damage)) {
        emitBurstParticles(state, projectile.x, projectile.y, {
          count: 10,
          colors: ['#ff9b8a', '#ffffff'],
          speedMin: 60,
          speedMax: 220,
          lifeMin: 0.16,
          lifeMax: 0.45,
        });
      }
      state.projectiles.splice(i, 1);
      continue;
    }

    if (distanceToPlayer < playerRadius + projectile.radius + GAME_CONFIG.grazeRadiusBonus) {
      state.stats.grazes += 1;
      player.echoCharge = clamp(player.echoCharge + 1.1 * modifiers.echoChargeMul, 0, GAME_CONFIG.echoChargeMax);
      player.grazeFlashSec = 0.18;
    }
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const reach = enemy.radius + playerRadius;
    if (distanceBetween(enemy.x, enemy.y, player.x, player.y) < reach) {
      applyDamageToPlayer(state, enemy.contactDamage);
      if (!enemy.isBoss) {
        enemy.hp -= 8;
        enemy.flashSec = 0.14;
      }
      const push = angleTo(enemy.x, enemy.y, player.x, player.y);
      player.vx += Math.cos(push) * 120;
      player.vy += Math.sin(push) * 120;
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].hp <= 0) {
      handleEnemyDeath(state, state.enemies[i], modifiers);
      state.enemies.splice(i, 1);
    }
  }

  if (state.pendingAdds && state.pendingAdds.length > 0) {
    for (const enemy of state.pendingAdds) state.enemies.push(enemy);
    state.pendingAdds.length = 0;
  }

  if (state.comboTimerSec > 0) {
    state.comboTimerSec -= dt;
    if (state.comboTimerSec <= 0) {
      state.combo = Math.max(1, Number((state.combo - 0.5).toFixed(2)));
      state.comboTimerSec = state.combo > 1 ? 1.6 : 0;
    }
  }
}

function explodeProjectile(state, projectile, modifiers) {
  const radius = projectile.aoe;
  emitShockwaveRing(state, projectile.x, projectile.y, {
    radiusEnd: radius,
    color: '#ffcf6b',
    life: 0.42,
    width: 4,
  });
  emitBurstParticles(state, projectile.x, projectile.y, {
    count: 16,
    colors: ['#ffd166', '#ff8f4a', '#ffffff'],
    speedMin: 60,
    speedMax: 300,
    lifeMin: 0.18,
    lifeMax: 0.5,
    sizeMin: 1.4,
    sizeMax: 4,
  });
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (distanceBetween(projectile.x, projectile.y, enemy.x, enemy.y) < radius + enemy.radius) {
      damageEnemy(state, enemy, projectile.damage * 0.45, { source: 'splash' }, modifiers);
    }
  }
  state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.18);
}

function damageEnemy(state, enemy, amount, projectile, modifiers) {
  if (enemy.hp <= 0) return;
  enemy.hp -= amount;
  enemy.flashSec = 0.12;
  state.stats.shotsLanded += 1;

  if (enemy.isBoss) {
    playImpactSynth(state.audio, 'boss-hurt');
  } else {
    playImpactSynth(state.audio, 'enemy');
  }

  emitBurstParticles(state, enemy.x, enemy.y, {
    count: 4,
    colors: [enemy.color, '#ffffff'],
    speedMin: 50,
    speedMax: 210,
    lifeMin: 0.12,
    lifeMax: 0.36,
    sizeMin: 1,
    sizeMax: 3,
  });

  if (projectile.source === 'echo' || projectile.source === 'prism') {
    state.stats.crossfireStrikes += 1;
  }
  void modifiers;
}

function handleEnemyDeath(state, enemy, modifiers) {
  state.stats.enemiesDefeated += 1;
  const gained = awardScore(state, enemy.score, modifiers);
  bumpCombo(state, enemy.isBoss ? 1.2 : GAME_CONFIG.comboStepPerKill, modifiers.comboGainMul);
  spawnShards(state, enemy.x, enemy.y, enemy.shardCount, enemy.isBoss ? 120 : 35 + enemy.score * 0.1);
  spawnFloatingCallout(state, enemy.x, enemy.y - enemy.radius, `+${gained}`, '#ffe9a8', enemy.isBoss ? 30 : 16);

  const player = state.player;
  player.echoCharge = clamp(player.echoCharge + 5 * modifiers.echoChargeMul, 0, GAME_CONFIG.echoChargeMax);
  player.overdriveCharge = clamp(
    player.overdriveCharge + 6 * modifiers.overdriveGainMul,
    0,
    GAME_CONFIG.overdriveChargeMax,
  );
  if (modifiers.lifestealPerKill > 0) {
    player.hull = Math.min(player.maxHull, player.hull + modifiers.lifestealPerKill);
  }

  emitBurstParticles(state, enemy.x, enemy.y, {
    count: enemy.isBoss ? 64 : 16,
    colors: [enemy.color, '#ffffff', '#ffd166'],
    speedMin: 60,
    speedMax: enemy.isBoss ? 460 : 260,
    lifeMin: 0.2,
    lifeMax: 0.8,
    sizeMin: 1.2,
    sizeMax: enemy.isBoss ? 6 : 3.8,
  });
  emitShockwaveRing(state, enemy.x, enemy.y, {
    radiusEnd: enemy.isBoss ? 300 : 62,
    color: enemy.color,
    life: enemy.isBoss ? 0.9 : 0.36,
    width: enemy.isBoss ? 6 : 2.4,
  });
  state.shakeTrauma = Math.min(1, state.shakeTrauma + (enemy.isBoss ? 1 : 0.12));

  if (enemy.type === 'splitter' && !state.endlessMode) {
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2 + state.rng();
      const child = createEnemy(state, 'drifter', { x: enemy.x + Math.cos(angle) * 30, y: enemy.y + Math.sin(angle) * 30 });
      child.radius = 11;
      child.hp = Math.max(12, enemy.maxHp * 0.22);
      child.maxHp = child.hp;
      child.speed = 132;
      child.score = 45;
      child.shardCount = 1;
      child.color = '#e0b3ff';
      child.label = 'Shardling';
      child.vx = Math.cos(angle) * 120;
      child.vy = Math.sin(angle) * 120;
      state.pendingAdds.push(child);
    }
  }

  if (enemy.isBoss) {
    state.stats.bossesDefeated += 1;
    state.hitStopSec = 0.28;
    spawnFloatingCallout(state, enemy.x, enemy.y - 40, 'BOSS DEFEATED', enemy.accent ?? '#ffd166', 34);
    for (let i = 0; i < 3; i++) {
      emitShockwaveRing(state, enemy.x, enemy.y, {
        radiusEnd: 220 + i * 90,
        color: i % 2 === 0 ? enemy.color : '#ffd166',
        life: 0.7 + i * 0.16,
        width: 5 - i,
      });
    }
    spawnShards(state, enemy.x, enemy.y, 14, 140);
  }
}

export function collectChronoShards(state, dt, modifiers) {
  const player = state.player;
  const magnetRadius = 96 + modifiers.shardMagnetBonus;

  for (let i = state.shards.length - 1; i >= 0; i--) {
    const shard = state.shards[i];
    shard.life -= dt;
    shard.spin += shard.spinSpeed * dt;
    const distance = distanceBetween(shard.x, shard.y, player.x, player.y);

    if (distance < magnetRadius) {
      const pull = clamp(1 - distance / magnetRadius, 0, 1);
      const angle = angleTo(shard.x, shard.y, player.x, player.y);
      shard.vx += Math.cos(angle) * 2200 * pull * dt;
      shard.vy += Math.sin(angle) * 2200 * pull * dt;
    }

    shard.vx *= 1 - Math.min(0.95, 2.6 * dt);
    shard.vy *= 1 - Math.min(0.95, 2.6 * dt);
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;

    if (distance < player.radius + 14 || shard.life <= 0) {
      if (distance < player.radius + 22 || shard.life > 0) {
        const value = Math.round(shard.value * modifiers.shardValueMul * state.combo);
        state.score += value;
        state.stats.shardsCollected += 1;
        player.echoCharge = clamp(
          player.echoCharge + 3.4 * modifiers.echoChargeMul,
          0,
          GAME_CONFIG.echoChargeMax,
        );
        player.overdriveCharge = clamp(
          player.overdriveCharge + 2.4 * modifiers.overdriveGainMul,
          0,
          GAME_CONFIG.overdriveChargeMax,
        );
        emitBurstParticles(state, shard.x, shard.y, {
          count: 3,
          colors: ['#ffe08a', '#fff6d0'],
          speedMin: 20,
          speedMax: 90,
          lifeMin: 0.1,
          lifeMax: 0.3,
          sizeMin: 1,
          sizeMax: 2.4,
        });
        playShardPickup(state.audio, Math.round(state.combo * 2));
      }
      state.shards.splice(i, 1);
    }
  }
}
