// Player skiff simulation: aiming, thrust, Phase-Dash, Overdrive, chassis weapons and damage intake.

import { ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_RADIUS, GAME_CONFIG } from './config.js';
import { angleTo, clamp } from './mathutil.js';
import { emitBurstParticles, emitShockwaveRing, queueAfterimage } from './particles.js';
import { spawnArenaProjectile } from './projectiles.js';
import { playDashWhoosh, playImpactSynth, playWeaponSynth } from './audio.js';
import { computeEchoCrossfireBonus, summonTemporalEcho } from './echo.js';
import { breakCombo } from './state.js';

const ACCELERATION = 2100;
const FRICTION = 6.4;
const DASH_SPEED = 1180;
const DASH_DURATION = 0.17;

export function updatePlayerShip(state, commands, dt, modifiers) {
  const player = state.player;
  const chassis = player.chassis;

  player.aimAngle = angleTo(player.x, player.y, commands.aimX, commands.aimY);
  player.fireTimer = Math.max(0, player.fireTimer - dt);
  player.dashTimer = Math.max(0, player.dashTimer - dt);
  player.invulnSec = Math.max(0, player.invulnSec - dt);
  player.hitFlashSec = Math.max(0, player.hitFlashSec - dt);
  player.grazeFlashSec = Math.max(0, player.grazeFlashSec - dt);
  player.muzzleFlashSec = Math.max(0, player.muzzleFlashSec - dt);
  player.overdriveActiveSec = Math.max(0, player.overdriveActiveSec - dt);

  if (commands.overdrivePressed && player.overdriveCharge >= GAME_CONFIG.overdriveChargeMax) {
    player.overdriveCharge = 0;
    player.overdriveActiveSec = 6.2;
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.5);
    emitShockwaveRing(state, player.x, player.y, { radiusEnd: 220, color: '#ffd166', life: 0.66, width: 5 });
    emitBurstParticles(state, player.x, player.y, {
      count: 34,
      colors: ['#fff3c4', '#ffd166', '#ff9f45'],
      speedMin: 120,
      speedMax: 420,
      lifeMin: 0.3,
      lifeMax: 0.8,
    });
  }

  const dashActive = player.dashActiveSec > 0;
  if (dashActive) {
    player.dashActiveSec = Math.max(0, player.dashActiveSec - dt);
    player.x += player.dashDirX * DASH_SPEED * dt;
    player.y += player.dashDirY * DASH_SPEED * dt;
    queueAfterimage(state, player.x, player.y, player.aimAngle, 'rgba(120, 240, 255, 0.6)', {
      life: 0.3,
      scale: 1,
    });
  } else {
    const speed = chassis.moveSpeed * modifiers.moveSpeedMul;
    player.vx += commands.moveX * ACCELERATION * dt;
    player.vy += commands.moveY * ACCELERATION * dt;
    player.vx *= 1 - Math.min(0.9, FRICTION * dt);
    player.vy *= 1 - Math.min(0.9, FRICTION * dt);
    const velocity = Math.hypot(player.vx, player.vy);
    if (velocity > speed) {
      player.vx = (player.vx / velocity) * speed;
      player.vy = (player.vy / velocity) * speed;
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  }

  const offsetX = player.x - ARENA_CENTER_X;
  const offsetY = player.y - ARENA_CENTER_Y;
  const distance = Math.hypot(offsetX, offsetY);
  const limit = ARENA_RADIUS - player.radius - 4;
  if (distance > limit) {
    const normalX = offsetX / (distance || 1);
    const normalY = offsetY / (distance || 1);
    player.x = ARENA_CENTER_X + normalX * limit;
    player.y = ARENA_CENTER_Y + normalY * limit;
    player.vx *= 0.25;
    player.vy *= 0.25;
  }

  if (player.shieldRegenDelay > 0) {
    player.shieldRegenDelay = Math.max(0, player.shieldRegenDelay - dt);
  } else if (player.shield < player.maxShield) {
    player.shield = Math.min(player.maxShield, player.shield + 9 * dt);
  }

  player.echoCharge = clamp(
    player.echoCharge + 5.5 * modifiers.echoChargeMul * dt,
    0,
    GAME_CONFIG.echoChargeMax,
  );
  if (player.overdriveActiveSec > 0) {
    player.echoCharge = clamp(
      player.echoCharge + 12 * modifiers.echoChargeMul * dt,
      0,
      GAME_CONFIG.echoChargeMax,
    );
  }

  if (commands.dashPressed) {
    triggerPhaseDash(state, commands, modifiers);
  }
  if (commands.firing) {
    fireChassisWeapon(state, modifiers);
  }
  if (commands.echoPressed) {
    summonTemporalEcho(state, modifiers);
  }

  return player;
}

export function fireChassisWeapon(state, modifiers) {
  const player = state.player;
  if (player.fireTimer > 0) return;
  const chassis = player.chassis;
  const overdrive = player.overdriveActiveSec > 0;
  const cooldown = chassis.fireCooldownSec * modifiers.cooldownMul * (overdrive ? 0.55 : 1);
  player.fireTimer = cooldown;

  const crossfire = computeEchoCrossfireBonus(state);
  const crit = state.rng() < modifiers.critChance;
  const critFactor = crit ? modifiers.critMultiplier : 1;
  const damage =
    chassis.bulletDamage *
    modifiers.damageMul *
    crossfire.multiplier *
    critFactor *
    (overdrive ? 1.32 : 1);

  const angle = player.aimAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const color = chassis.primaryColor;
  const extraShots = modifiers.projectileBonus;
  const shots = [];

  if (chassis.id === 'solar-lance') {
    const spread = extraShots > 0 ? [-0.07, 0.07][0] : 0;
    shots.push({ lateral: -7, angleOffset: -0.012 + spread, radius: 3.6, length: 34, kind: 'lance' });
    shots.push({ lateral: 7, angleOffset: 0.012 - spread, radius: 3.6, length: 34, kind: 'lance' });
  } else if (chassis.id === 'astraea-prism') {
    shots.push({ lateral: 0, angleOffset: 0, radius: 4, length: 26, kind: 'prism' });
    shots.push({ lateral: 0, angleOffset: 0.125, radius: 3.2, length: 18, kind: 'prism' });
    shots.push({ lateral: 0, angleOffset: -0.125, radius: 3.2, length: 18, kind: 'prism' });
  } else {
    shots.push({ lateral: 0, angleOffset: 0, radius: 7.2, length: 16, kind: 'mortar' });
  }

  for (let i = 0; i < extraShots; i++) {
    const offset = (i + 1) * 0.09 * (i % 2 === 0 ? 1 : -1);
    shots.push({
      lateral: 0,
      angleOffset: offset,
      radius: chassis.id === 'orbital-bastion' ? 6 : 3,
      length: 16,
      kind: chassis.id === 'orbital-bastion' ? 'mortar' : 'bolt',
    });
  }

  for (const shot of shots) {
    const shotAngle = angle + shot.angleOffset;
    const originX = player.x + Math.cos(shotAngle) * 20 - sin * shot.lateral;
    const originY = player.y + Math.sin(shotAngle) * 20 + cos * shot.lateral;
    spawnArenaProjectile(state, {
      x: originX,
      y: originY,
      vx: Math.cos(shotAngle) * chassis.bulletSpeed,
      vy: Math.sin(shotAngle) * chassis.bulletSpeed,
      radius: shot.radius,
      damage: damage * (shot.angleOffset === 0 ? 1 : 0.82),
      friendly: true,
      color,
      kind: shot.kind,
      life: 1.6,
      pierce: modifiers.pierceBonus,
      aoe: shot.kind === 'mortar' ? 58 : 0,
      source: 'player',
      length: shot.length,
    });
  }

  state.stats.shotsFired += shots.length;
  player.muzzleFlashSec = 0.09;
  player.vx -= cos * 22;
  player.vy -= sin * 22;
  emitBurstParticles(state, player.x + cos * 22, player.y + sin * 22, {
    count: 4,
    colors: [color, '#ffffff'],
    speedMin: 40,
    speedMax: 140,
    lifeMin: 0.08,
    lifeMax: 0.22,
    sizeMin: 1,
    sizeMax: 2.6,
    angle,
    spread: 0.9,
  });
  state.shakeTrauma = Math.min(1, state.shakeTrauma + (chassis.id === 'orbital-bastion' ? 0.16 : 0.05));
  playWeaponSynth(state.audio, chassis.id, shots.length);
  if (crit) {
    state.callouts.push({
      x: player.x + cos * 60,
      y: player.y + sin * 60,
      text: 'CRIT',
      color: '#ffe08a',
      life: 0.55,
      maxLife: 0.55,
      size: 16,
    });
  }
}

export function triggerPhaseDash(state, commands, modifiers) {
  const player = state.player;
  if (player.dashTimer > 0) return false;
  player.dashTimer = player.chassis.dashCooldownSec * modifiers.dashCooldownMul;
  player.dashActiveSec = DASH_DURATION;
  player.invulnSec = Math.max(player.invulnSec, 0.36);

  const inputLength = Math.hypot(commands.moveX, commands.moveY);
  if (inputLength > 0.1) {
    player.dashDirX = commands.moveX / inputLength;
    player.dashDirY = commands.moveY / inputLength;
  } else {
    player.dashDirX = Math.cos(player.aimAngle);
    player.dashDirY = Math.sin(player.aimAngle);
  }

  emitShockwaveRing(state, player.x, player.y, {
    radiusEnd: player.chassis.id === 'orbital-bastion' ? 170 : 108,
    color: player.chassis.accentColor,
    life: 0.4,
    width: 3,
  });
  emitBurstParticles(state, player.x, player.y, {
    count: 16,
    colors: [player.chassis.primaryColor, player.chassis.accentColor, '#ffffff'],
    speedMin: 80,
    speedMax: 260,
    lifeMin: 0.18,
    lifeMax: 0.5,
    angle: Math.atan2(-player.dashDirY, -player.dashDirX),
    spread: 1.2,
  });
  playDashWhoosh(state.audio);
  state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.16);

  if (player.chassis.id === 'orbital-bastion') {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const projectile = state.projectiles[i];
      if (!projectile.friendly && Math.hypot(projectile.x - player.x, projectile.y - player.y) < 190) {
        emitBurstParticles(state, projectile.x, projectile.y, {
          count: 3,
          colors: ['#ffd166', '#ffffff'],
          speedMin: 20,
          speedMax: 90,
          lifeMin: 0.1,
          lifeMax: 0.3,
        });
        state.projectiles.splice(i, 1);
      }
    }
    for (const enemy of state.enemies) {
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 190) {
        enemy.flashSec = 0.18;
        enemy.hp -= 12 * modifiers.damageMul;
      }
    }
  }
  return true;
}

export function applyDamageToPlayer(state, rawAmount) {
  const player = state.player;
  if (player.invulnSec > 0 || player.dashActiveSec > 0) return false;
  const modifiers = state.currentModifiers;
  const amount = rawAmount * (1 - (modifiers?.damageReduction ?? 0));
  let remaining = amount;

  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, remaining);
    player.shield -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    player.hull = Math.max(0, player.hull - remaining);
  }

  player.invulnSec = 0.7;
  player.shieldRegenDelay = 2.4;
  player.hitFlashSec = 0.3;
  breakCombo(state, 0.5);
  state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.55);
  emitBurstParticles(state, player.x, player.y, {
    count: 18,
    colors: ['#ff7a7a', '#ffd166', '#ffffff'],
    speedMin: 90,
    speedMax: 320,
    lifeMin: 0.2,
    lifeMax: 0.56,
  });
  playImpactSynth(state.audio, 'player-hurt');
  return true;
}

export function healPlayer(state, amount) {
  const player = state.player;
  player.hull = Math.min(player.maxHull, player.hull + amount);
}
