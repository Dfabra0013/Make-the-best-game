// Single projectile factory and motion integrator shared by player, echoes, and hostiles.

import { ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_RADIUS } from './config.js';

const MAX_PROJECTILES = 820;

export function spawnArenaProjectile(state, spec) {
  const life = spec.life ?? 2.4;
  const projectile = {
    id: state.nextEntityId++,
    x: spec.x,
    y: spec.y,
    vx: spec.vx ?? 0,
    vy: spec.vy ?? 0,
    radius: spec.radius ?? 4,
    damage: spec.damage ?? 10,
    friendly: Boolean(spec.friendly),
    color: spec.color ?? '#ffffff',
    kind: spec.kind ?? 'bolt',
    life,
    maxLife: life,
    pierce: spec.pierce ?? 0,
    aoe: spec.aoe ?? 0,
    source: spec.source ?? (spec.friendly ? 'player' : 'enemy'),
    refractions: 0,
    spin: spec.spin ?? 0,
    length: spec.length ?? 14,
    phase: 0,
    trail: [],
  };
  state.projectiles.push(projectile);
  if (state.projectiles.length > MAX_PROJECTILES) {
    state.projectiles.splice(0, state.projectiles.length - MAX_PROJECTILES);
  }
  return projectile;
}

export function advanceProjectileMotion(projectile, dt) {
  projectile.x += projectile.vx * dt;
  projectile.y += projectile.vy * dt;
  projectile.life -= dt;
  projectile.phase += dt * 9;

  if (projectile.trail.length < 6) {
    projectile.trail.push({ x: projectile.x, y: projectile.y });
  } else {
    projectile.trail.shift();
    projectile.trail.push({ x: projectile.x, y: projectile.y });
  }
}

export function projectileOutsideArena(projectile, margin = 46) {
  const dx = projectile.x - ARENA_CENTER_X;
  const dy = projectile.y - ARENA_CENTER_Y;
  return projectile.life <= 0 || Math.hypot(dx, dy) > ARENA_RADIUS + margin;
}
