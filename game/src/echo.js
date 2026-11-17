// Time-Echo system: records the last five seconds of flight and replays it as an allied clone.

import { GAME_CONFIG } from './config.js';
import { angleTo, clamp, distanceBetween } from './mathutil.js';
import { emitBurstParticles, emitShockwaveRing, queueAfterimage } from './particles.js';
import { spawnArenaProjectile } from './projectiles.js';

const MAX_ACTIVE_ECHOES = 3;

export function recordPlayerTimelineFrame(state) {
  const player = state.player;
  const index = state.timelineHead % GAME_CONFIG.echoHistoryFrames;
  const frame = state.timelineBuffer[index];
  if (frame) {
    frame.x = player.x;
    frame.y = player.y;
    frame.aimAngle = player.aimAngle;
  }
  state.timelineHead += 1;
}

export function summonTemporalEcho(state, modifiers) {
  const player = state.player;
  if (player.echoCharge < GAME_CONFIG.echoSummonCost) return null;
  if (state.echoes.length >= MAX_ACTIVE_ECHOES) return null;

  player.echoCharge -= GAME_CONFIG.echoSummonCost;
  const duration =
    (4.2 + (modifiers?.echoDurationBonusSec ?? 0) + (player.overdriveActiveSec > 0 ? 1.1 : 0)) *
    player.chassis.echoDurationBonus;

  const echo = {
    id: state.nextEntityId++,
    x: player.x,
    y: player.y,
    aimAngle: player.aimAngle,
    duration,
    life: duration,
    spawnHead: state.timelineHead,
    fireTimer: 0.32,
    fireInterval: 0.23,
    damage: 9 * (modifiers?.echoDamageMul ?? 1) * (player.overdriveActiveSec > 0 ? 1.4 : 1),
    pierce: modifiers?.echoPierceBonus ?? 0,
    trailTimer: 0,
    radius: 13,
  };
  state.echoes.push(echo);
  state.stats.echoesSummoned += 1;
  emitShockwaveRing(state, echo.x, echo.y, { radiusEnd: 132, color: '#8ff6ff', life: 0.52, width: 3.6 });
  emitBurstParticles(state, echo.x, echo.y, {
    count: 22,
    colors: ['#d9ffff', '#6ef2ff', '#2fa4ff'],
    speedMin: 60,
    speedMax: 280,
    lifeMin: 0.24,
    lifeMax: 0.72,
    sizeMin: 1.2,
    sizeMax: 3.6,
  });
  state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.22);
  return echo;
}

function findEchoTarget(state, echo) {
  let best = null;
  let bestDistance = 620;
  for (const enemy of state.enemies) {
    const distance = distanceBetween(echo.x, echo.y, enemy.x, enemy.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = enemy;
    }
  }
  return best;
}

export function updateTemporalEchoes(state, dt, modifiers) {
  for (let i = state.echoes.length - 1; i >= 0; i--) {
    const echo = state.echoes[i];
    echo.life -= dt;

    const lagFrames = clamp(
      Math.round((echo.duration - echo.life) * 60),
      0,
      GAME_CONFIG.echoHistoryFrames - 1,
    );
    const frameIndex =
      ((echo.spawnHead - lagFrames) % GAME_CONFIG.echoHistoryFrames + GAME_CONFIG.echoHistoryFrames) %
      GAME_CONFIG.echoHistoryFrames;
    const frame = state.timelineBuffer[frameIndex];
    if (frame) {
      echo.x = frame.x;
      echo.y = frame.y;
      echo.aimAngle = frame.aimAngle;
    }

    echo.trailTimer -= dt;
    if (echo.trailTimer <= 0) {
      echo.trailTimer = 0.06;
      queueAfterimage(state, echo.x, echo.y, echo.aimAngle, 'rgba(94, 240, 255, 0.5)', { life: 0.3, scale: 0.92 });
      emitBurstParticles(state, echo.x, echo.y, {
        count: 1,
        colors: ['#7ef4ff', '#b6fbff'],
        speedMin: 6,
        speedMax: 34,
        lifeMin: 0.18,
        lifeMax: 0.42,
        sizeMin: 1,
        sizeMax: 2.4,
      });
    }

    echo.fireTimer -= dt;
    if (echo.fireTimer <= 0) {
      const target = findEchoTarget(state, echo);
      if (target) {
        echo.fireTimer = echo.fireInterval;
        const angle = angleTo(echo.x, echo.y, target.x, target.y);
        const speed = 720;
        spawnArenaProjectile(state, {
          x: echo.x + Math.cos(angle) * 14,
          y: echo.y + Math.sin(angle) * 14,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3.6,
          damage: echo.damage,
          friendly: true,
          color: echo.pierce > 0 ? '#b9fbff' : '#63f4ff',
          kind: 'echo',
          life: 1.5,
          pierce: echo.pierce,
          source: 'echo',
          length: 18,
        });
      } else {
        echo.fireTimer = 0.2;
      }
    }

    if (echo.life <= 0) {
      state.echoes.splice(i, 1);
      emitBurstParticles(state, echo.x, echo.y, {
        count: 18,
        colors: ['#9ff9ff', '#4fd7ff', '#ffffff'],
        speedMin: 40,
        speedMax: 190,
        lifeMin: 0.2,
        lifeMax: 0.6,
      });
      emitShockwaveRing(state, echo.x, echo.y, { radiusEnd: 96, color: '#85f2ff', life: 0.4, width: 2.4 });
    }
  }

  const crossfire = computeEchoCrossfireBonus(state);
  if (crossfire.crossfire) {
    state.player.grazeFlashSec = Math.max(state.player.grazeFlashSec, 0.12);
  }
  return crossfire;
}

export function computeEchoCrossfireBonus(state) {
  const echoes = state.echoes.length;
  if (echoes === 0) return { multiplier: 1, echoes: 0, crossfire: false };
  let nearby = 0;
  for (const echo of state.echoes) {
    if (distanceBetween(echo.x, echo.y, state.player.x, state.player.y) < 300) nearby += 1;
  }
  const multiplier = 1 + 0.13 * echoes + (nearby > 0 ? 0.12 : 0);
  return { multiplier: Number(multiplier.toFixed(3)), echoes, crossfire: nearby > 0 };
}
