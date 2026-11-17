// Canvas art direction: astrolabe arena, skiffs, Temporal Echoes, hostiles and additive effects.

import { ARENA_CENTER_X, ARENA_CENTER_Y, ARENA_RADIUS, ARENA_WIDTH, ARENA_HEIGHT } from './config.js';
import { clamp, TWO_PI } from './mathutil.js';

const FONT_STACK = '"DejaVu Sans", "Segoe UI", Helvetica, Arial, sans-serif';

export function roundedRectPath(ctx, x, y, w, h, r = 12) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawGlassPanel(ctx, x, y, w, h, options = {}) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, options.radius ?? 14);
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, options.top ?? 'rgba(19, 30, 58, 0.93)');
  gradient.addColorStop(1, options.bottom ?? 'rgba(7, 12, 26, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = options.border ?? 'rgba(140, 186, 255, 0.3)';
  ctx.lineWidth = options.borderWidth ?? 1.4;
  ctx.stroke();
  if (options.accent) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = options.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 1.5);
    ctx.lineTo(x + w, y + 1.5);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export function drawGlowText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.font = `${options.weight ?? 700} ${options.size ?? 18}px ${FONT_STACK}`;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = options.baseline ?? 'alphabetic';
  if (options.letterSpacing !== undefined && 'letterSpacing' in ctx) ctx.letterSpacing = `${options.letterSpacing}px`;
  if (options.glow) {
    ctx.shadowColor = options.glow;
    ctx.shadowBlur = options.blur ?? 16;
  }
  if (options.stroke) {
    ctx.lineWidth = options.strokeWidth ?? 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = options.stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = options.color ?? '#f2f5ff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function poly(ctx, points, close = true) {
  ctx.beginPath();
  points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  if (close) ctx.closePath();
}

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TWO_PI);
}

function radial(ctx, x, y, r0, r1, stops) {
  const gradient = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

function glowDot(ctx, x, y, radius, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = radial(ctx, x, y, 0, radius, [
    [0, color],
    [1, 'rgba(0,0,0,0)'],
  ]);
  circle(ctx, x, y, radius);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function strokeRing(ctx, radius, color, width, alpha = 1, dash = []) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  circle(ctx, 0, 0, radius);
  ctx.stroke();
  ctx.restore();
}

function drawBackdrop(ctx, state, time) {
  const realm = state.realm;
  const backdrop = radial(ctx, ARENA_CENTER_X, ARENA_CENTER_Y, 60, 780, [
    [0, realm.bgInner],
    [0.58, realm.bgMid],
    [1, realm.bgOuter],
  ]);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  for (const star of state.stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(time * star.twinkleSpeed + star.phase);
    ctx.fillStyle = star.warm
      ? `rgba(255, 232, 186, ${clamp(star.alpha * twinkle, 0, 1)})`
      : `rgba(198, 226, 255, ${clamp(star.alpha * twinkle, 0, 1)})`;
    circle(ctx, star.x, star.y, star.radius * (star.layer === 2 ? 1.25 : 1));
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const drift = Math.sin(time * 0.4) * 34;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = radial(ctx, ARENA_CENTER_X - 190 + drift, ARENA_CENTER_Y - 210, 20, 420, [
    [0, realm.nebulaGlow],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  ctx.restore();
}

export function renderArenaWorld(ctx, state, time) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackdrop(ctx, state, time);

  ctx.save();
  ctx.translate(state.shakeOffsetX ?? 0, state.shakeOffsetY ?? 0);
  renderAstrolabeFloor(ctx, state, time);
  drawPrisms(ctx, state, time);
  drawShards(ctx, state);
  renderEnemiesAndProjectiles(ctx, state, time);
  renderPlayerAndEchoes(ctx, state, time);
  drawParticlesAndCallouts(ctx, state);
  ctx.restore();

  const realm = state.realm;
  ctx.save();
  ctx.translate(ARENA_CENTER_X, ARENA_CENTER_Y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.42 + 0.24 * Math.sin(time * 1.4);
  ctx.fillStyle = radial(ctx, 0, 0, ARENA_RADIUS - 70, ARENA_RADIUS + 40, [
    [0, 'rgba(0,0,0,0)'],
    [0.75, realm.nebulaGlow],
    [1, 'rgba(0,0,0,0)'],
  ]);
  circle(ctx, 0, 0, ARENA_RADIUS + 6);
  ctx.fill();
  ctx.restore();

  const vignette = radial(ctx, ARENA_CENTER_X, ARENA_CENTER_Y, 380, 820, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(0, 0, 0, 0.62)'],
  ]);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
}

export function renderAstrolabeFloor(ctx, state, time) {
  const realm = state.realm;
  ctx.save();
  ctx.translate(ARENA_CENTER_X, ARENA_CENTER_Y);

  ctx.fillStyle = radial(ctx, 0, 0, 40, ARENA_RADIUS, [
    [0, 'rgba(24, 42, 78, 0.86)'],
    [0.72, 'rgba(12, 22, 46, 0.72)'],
    [1, 'rgba(5, 10, 22, 0.82)'],
  ]);
  circle(ctx, 0, 0, ARENA_RADIUS);
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, 0, 0, ARENA_RADIUS * 0.95, realm.nebulaGlow);
  ctx.restore();
  strokeRing(ctx, ARENA_RADIUS, realm.ringPrimary, 2.8, 1);
  strokeRing(ctx, ARENA_RADIUS - 11, realm.ringPrimary, 1.2, 0.4);

  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * TWO_PI;
    const major = i % 6 === 0;
    ctx.strokeStyle = major ? realm.ringPrimary : 'rgba(160, 200, 255, 0.34)';
    ctx.globalAlpha = major ? 0.95 : 0.52;
    ctx.lineWidth = major ? 2 : 1;
    const inner = ARENA_RADIUS - (major ? 22 : 11);
    poly(ctx, [
      [Math.cos(angle) * inner, Math.sin(angle) * inner],
      [Math.cos(angle) * (ARENA_RADIUS - 3), Math.sin(angle) * (ARENA_RADIUS - 3)],
    ], false);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const rings = [
    [ARENA_RADIUS * 0.84, 0.44, 1.8, [14, 20], -22],
    [ARENA_RADIUS * 0.68, 0.36, 1.5, [4, 14], 34],
    [ARENA_RADIUS * 0.46, 0.3, 1.3, [], 0],
    [ARENA_RADIUS * 0.27, 0.4, 1.8, [26, 18], 12],
  ];
  for (const [radius, alpha, width, dash, spin] of rings) {
    ctx.save();
    ctx.rotate((time * spin * Math.PI) / 180);
    ctx.lineDashOffset = -time * 26;
    strokeRing(ctx, radius, realm.ringSecondary, width, alpha, dash);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = realm.ringSecondary;
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * TWO_PI;
    poly(ctx, [[0, 0], [Math.cos(angle) * ARENA_RADIUS * 0.94, Math.sin(angle) * ARENA_RADIUS * 0.94]], false);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(time * 0.16);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = realm.ringPrimary;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TWO_PI;
    poly(ctx, [
      [Math.cos(angle) * 22, Math.sin(angle) * 22],
      [Math.cos(angle) * 58, Math.sin(angle) * 58],
    ], false);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(6, 12, 24, 0.9)';
  circle(ctx, 0, 0, 16);
  ctx.fill();
  strokeRing(ctx, 16, realm.ringSecondary, 2, 0.75);
  ctx.restore();
}

function drawPrisms(ctx, state, time) {
  const realm = state.realm;
  for (const prism of state.prisms) {
    const flash = prism.flashSec > 0 ? prism.flashSec / 0.3 : 0;
    ctx.save();
    ctx.translate(prism.x, prism.y);
    ctx.rotate(prism.angle * 0.7 + time * 0.4);
    ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, 0, 0, prism.radius * (2.6 + flash * 1.4), `rgba(120, 245, 255, ${0.32 + flash * 0.4})`);
    ctx.globalCompositeOperation = 'source-over';
    strokeRing(ctx, prism.radius * 1.5, realm.prismColor, 1.2, 0.5, [5, 9]);

    const hex = [];
    for (let i = 0; i < 6; i++) hex.push([Math.cos((i / 6) * TWO_PI) * prism.radius, Math.sin((i / 6) * TWO_PI) * prism.radius]);
    poly(ctx, hex);
    ctx.fillStyle = `rgba(18, 44, 62, ${0.72 + flash * 0.2})`;
    ctx.fill();
    ctx.strokeStyle = flash > 0 ? '#ffffff' : realm.prismColor;
    ctx.lineWidth = 2 + flash * 2;
    ctx.stroke();

    poly(ctx, [[0, -prism.radius * 0.52], [prism.radius * 0.46, prism.radius * 0.34], [-prism.radius * 0.46, prism.radius * 0.34]]);
    ctx.strokeStyle = `rgba(200, 252, 255, ${0.6 + flash * 0.4})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
}

function drawShards(ctx, state) {
  for (const shard of state.shards) {
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.spin);
    ctx.globalAlpha = 0.55 + clamp(shard.life, 0, 1) * 0.45;
    const gold = ctx.createLinearGradient(0, -shard.size, 0, shard.size);
    gold.addColorStop(0, '#fff6cf');
    gold.addColorStop(0.5, '#ffcf5c');
    gold.addColorStop(1, '#e08b1f');
    poly(ctx, [[0, -shard.size], [shard.size * 0.72, 0], [0, shard.size], [-shard.size * 0.72, 0]]);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 250, 224, 0.9)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawShipHull(ctx, chassis, options = {}) {
  poly(ctx, [[23, 0], [-2, -9], [-15, -15], [-8, -2], [-12, 0], [-8, 2], [-15, 15], [-2, 9]]);
  if (options.ghost) {
    ctx.fillStyle = options.fill ?? 'rgba(90, 240, 255, 0.14)';
    ctx.fill();
    ctx.strokeStyle = options.stroke ?? 'rgba(150, 250, 255, 0.85)';
    ctx.lineWidth = options.lineWidth ?? 1.8;
    ctx.stroke();
    return;
  }
  const gradient = ctx.createLinearGradient(-16, 0, 24, 0);
  gradient.addColorStop(0, chassis.accentColor);
  gradient.addColorStop(0.55, chassis.primaryColor);
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  poly(ctx, [[6, 0], [-4, -3.4], [-4, 3.4]]);
  ctx.fillStyle = 'rgba(8, 16, 30, 0.9)';
  ctx.fill();
  ctx.fillStyle = chassis.accentColor;
  circle(ctx, 2, 0, 2.1);
  ctx.fill();
}

function drawPlayerShip(ctx, state, time) {
  const player = state.player;
  const chassis = player.chassis;
  const flicker = Math.sin(time * 42) * 0.5 + 0.5;

  for (const ghost of state.afterimages) {
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.angle);
    ctx.globalAlpha = clamp(ghost.life / ghost.maxLife, 0, 1) * 0.55;
    ctx.scale(ghost.scale, ghost.scale);
    drawShipHull(ctx, chassis, { ghost: true, fill: ghost.color });
    ctx.restore();
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.overdriveActiveSec > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, 0, 0, 58, 'rgba(255, 214, 110, 0.4)');
    ctx.restore();
  }

  ctx.rotate(player.aimAngle);
  const thrust = Math.hypot(player.vx, player.vy) / 320;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const flareLength = 18 + thrust * 26 + flicker * 8;
  const flare = ctx.createLinearGradient(-14, 0, -14 - flareLength, 0);
  flare.addColorStop(0, chassis.accentColor);
  flare.addColorStop(0.5, 'rgba(120, 220, 255, 0.55)');
  flare.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = flare;
  poly(ctx, [[-13, -5], [-13 - flareLength, 0], [-13, 5]]);
  ctx.fill();
  ctx.restore();

  if (player.invulnSec > 0) {
    ctx.save();
    ctx.globalAlpha = 0.32 + flicker * 0.28;
    strokeRing(ctx, 27, chassis.accentColor, 2, 1, [8, 6]);
    ctx.restore();
  }
  if (player.hitFlashSec > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(player.hitFlashSec / 0.3, 0, 1);
    ctx.fillStyle = '#ff5a5a';
    circle(ctx, 0, 0, 26);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, 0, 0, 40, 'rgba(255, 236, 180, 0.2)');
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(3, 6, 14, 0.92)';
  ctx.beginPath();
  ctx.ellipse(-1, 0, 31, 22, 0, 0, TWO_PI);
  ctx.fill();
  ctx.restore();
  ctx.scale(1.16, 1.16);
  drawShipHull(ctx, chassis);

  if (player.muzzleFlashSec > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(player.muzzleFlashSec / 0.09, 0, 1);
    ctx.fillStyle = '#fff6cf';
    ctx.beginPath();
    ctx.ellipse(26, 0, 12, 5, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  if (player.shield > 0.5) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = 0.2 + clamp(player.shield / player.maxShield, 0, 1) * 0.42;
    strokeRing(ctx, 24 + Math.sin(time * 3) * 1.6, chassis.accentColor, 1.8);
    ctx.restore();
  }
}

function drawEchoes(ctx, state, time) {
  for (const echo of state.echoes) {
    const lifeRatio = clamp(echo.life / echo.duration, 0, 1);
    ctx.save();
    ctx.translate(echo.x, echo.y);
    ctx.rotate(echo.aimAngle);
    ctx.globalAlpha = 0.48 + lifeRatio * 0.42;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, 0, 0, 52, 'rgba(110, 246, 255, 0.42)');
    ctx.restore();
    ctx.scale(1.08, 1.08);
    drawShipHull(ctx, state.player.chassis, { ghost: true, fill: 'rgba(80, 226, 255, 0.22)', stroke: 'rgba(196, 253, 255, 0.95)', lineWidth: 2.2 });
    ctx.restore();

    ctx.save();
    ctx.translate(echo.x, echo.y);
    ctx.globalAlpha = 0.42;
    ctx.lineDashOffset = -time * 40;
    strokeRing(ctx, 26 + Math.sin(time * 4 + echo.id) * 2, '#8ff6ff', 1.4, 1, [5, 9]);
    ctx.restore();

    drawGlowText(ctx, 'ECHO', echo.x, echo.y - 44, {
      size: 10,
      align: 'center',
      color: '#c8fdff',
      glow: 'rgba(90, 240, 255, 0.95)',
      blur: 12,
      letterSpacing: 2.6,
    });
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#8ff6ff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(echo.x, echo.y - 34);
    ctx.lineTo(echo.x, echo.y - 24);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderPlayerAndEchoes(ctx, state, time) {
  drawEchoes(ctx, state, time);
  drawPlayerShip(ctx, state, time);
}

function drawEnemyShape(ctx, enemy, time) {
  const radius = enemy.radius;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillStyle = enemy.flashSec > 0 ? '#ffffff' : enemy.color;

  if (enemy.shape === 'tri') {
    poly(ctx, [[radius, 0], [-radius * 0.7, -radius * 0.82], [-radius * 0.7, radius * 0.82]]);
  } else if (enemy.shape === 'arrow') {
    poly(ctx, [[radius, 0], [-radius * 0.5, -radius * 0.9], [-radius * 0.2, 0], [-radius * 0.5, radius * 0.9]]);
  } else if (enemy.shape === 'diamond') {
    poly(ctx, [[radius, 0], [0, -radius], [-radius, 0], [0, radius]]);
  } else if (enemy.shape === 'hex') {
    const hex = [];
    for (let i = 0; i < 6; i++) hex.push([Math.cos((i / 6) * TWO_PI + Math.PI / 6) * radius, Math.sin((i / 6) * TWO_PI + Math.PI / 6) * radius]);
    poly(ctx, hex);
  } else if (enemy.shape === 'ring') {
    circle(ctx, 0, 0, radius * 0.78);
  } else {
    poly(ctx, [[0, -radius], [radius * 0.66, -radius * 0.3], [radius * 0.5, radius], [-radius * 0.5, radius], [-radius * 0.66, -radius * 0.3]]);
  }
  ctx.fill();
  ctx.stroke();

  if (enemy.shape === 'hex') {
    strokeRing(ctx, radius * 0.42, 'rgba(20, 10, 30, 0.7)', 2);
  } else if (enemy.shape === 'ring') {
    ctx.save();
    ctx.rotate(time * 1.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * TWO_PI;
      poly(ctx, [
        [Math.cos(angle) * radius * 0.86, Math.sin(angle) * radius * 0.86],
        [Math.cos(angle) * radius * 1.24, Math.sin(angle) * radius * 1.24],
      ], false);
      ctx.stroke();
    }
    ctx.restore();
  } else if (enemy.shape !== 'tri' && enemy.shape !== 'arrow' && enemy.shape !== 'diamond') {
    poly(ctx, [[0, -radius * 0.6], [0, radius * 0.6]], false);
    ctx.strokeStyle = 'rgba(20, 10, 20, 0.6)';
    ctx.stroke();
  }
}

function drawBoss(ctx, boss, time) {
  const radius = boss.radius;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, 0, 0, radius * 2.6, `${boss.color}66`);
  ctx.restore();

  ctx.save();
  ctx.rotate(time * 0.5);
  strokeRing(ctx, radius * 1.32, boss.accent, 2, 0.75, [16, 12]);
  ctx.restore();

  ctx.save();
  ctx.rotate(-time * 0.8);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = boss.color;
  ctx.lineWidth = 3;
  const star = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * TWO_PI;
    const length = i % 2 === 0 ? radius * 1.16 : radius * 0.92;
    star.push([Math.cos(angle) * length, Math.sin(angle) * length]);
  }
  poly(ctx, star);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = radial(ctx, 0, -radius * 0.24, radius * 0.1, radius, [
    [0, boss.flashSec > 0 ? '#ffffff' : '#fff3d2'],
    [0.2, boss.flashSec > 0 ? '#ffe6e6' : boss.accent],
    [0.62, boss.flashSec > 0 ? '#ffd0d0' : boss.color],
    [1, 'rgba(26, 6, 18, 0.97)'],
  ]);
  const body = [];
  for (let i = 0; i < 6; i++) body.push([Math.cos((i / 6) * TWO_PI + Math.PI / 6) * radius, Math.sin((i / 6) * TWO_PI + Math.PI / 6) * radius]);
  poly(ctx, body);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.save();
  ctx.rotate(time * 1.4);
  ctx.fillStyle = 'rgba(10, 4, 12, 0.85)';
  circle(ctx, 0, 0, radius * 0.42);
  ctx.fill();
  strokeRing(ctx, radius * 0.42, boss.accent, 3);
  ctx.fillStyle = '#fff4d0';
  circle(ctx, 0, 0, radius * 0.16 + Math.sin(time * 6) * 2);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < 3; i++) {
    const start = -Math.PI / 2 + (i / 3) * TWO_PI;
    ctx.strokeStyle = i <= boss.phaseIndex ? boss.accent : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.48, start, start + Math.PI / 3.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemyTelegraph(ctx, enemy) {
  const telegraph = enemy.telegraphSec ?? 0;
  if (telegraph <= 0) return;
  const intensity = clamp(1 - telegraph / 0.9, 0, 1);
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.telegraphAngle);
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createLinearGradient(0, 0, 900, 0);
  beam.addColorStop(0, `rgba(255, 92, 120, ${0.4 + intensity * 0.4})`);
  beam.addColorStop(0.6, 'rgba(255, 180, 120, 0.18)');
  beam.addColorStop(1, 'rgba(255, 92, 120, 0)');
  ctx.fillStyle = beam;
  poly(ctx, [[0, -3 - intensity * 4], [900, -14 - intensity * 12], [900, 14 + intensity * 12], [0, 3 + intensity * 4]]);
  ctx.fill();
  ctx.restore();
}

export function renderEnemiesAndProjectiles(ctx, state, time) {
  for (const enemy of state.enemies) {
    if (enemy.isBoss) {
      drawEnemyTelegraph(ctx, enemy);
      drawBoss(ctx, enemy, time);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = enemy.spawnGraceSec > 0 ? 0.45 + 0.55 * (1 - enemy.spawnGraceSec / 0.45) : 1;
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, 0, 0, enemy.radius * 2.5, `${enemy.color}55`);
    ctx.restore();
    drawEnemyShape(ctx, enemy, time);
    ctx.restore();

    if (enemy.spawnGraceSec > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      strokeRing(ctx, enemy.radius + 12 + enemy.spawnGraceSec * 26, enemy.color, 1.6);
      ctx.translate(enemy.x, enemy.y);
      ctx.restore();
    }

    if (enemy.hp < enemy.maxHp) {
      const width = enemy.radius * 2;
      const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(4, 8, 18, 0.72)';
      ctx.fillRect(enemy.x - width / 2 - 1, enemy.y - enemy.radius - 13, width + 2, 5);
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * ratio, 3);
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const projectile of state.projectiles) {
    const angle = Math.atan2(projectile.vy, projectile.vx);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    if (projectile.friendly) {
      const length = Math.max(projectile.length, Math.hypot(projectile.vx, projectile.vy) * 0.032);
      const beam = ctx.createLinearGradient(-length * 1.9, 0, length * 0.35, 0);
      beam.addColorStop(0, 'rgba(0,0,0,0)');
      beam.addColorStop(0.55, projectile.color);
      beam.addColorStop(1, '#ffffff');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.ellipse(0, 0, length * 0.95, projectile.radius * 0.8, 0, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(length * 0.2, 0, length * 0.3, projectile.radius * 0.34, 0, 0, TWO_PI);
      ctx.fill();
    } else {
      glowDot(ctx, 0, 0, projectile.radius * 3.4, projectile.color);
      ctx.fillStyle = projectile.color;
      circle(ctx, 0, 0, projectile.radius * 1.1);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      circle(ctx, 0, 0, projectile.radius * 0.3);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawParticlesAndCallouts(ctx, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pool = state.particlePool;
  if (pool) {
    for (let i = 0; i < pool.capacity; i++) {
      const particle = pool.slots[i];
      if (!particle.alive) continue;
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      circle(ctx, particle.x, particle.y, particle.size * (0.4 + alpha * 0.8));
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  for (const ring of state.shockwaves) {
    const alpha = clamp(ring.life / ring.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.width * alpha;
    circle(ctx, ring.x, ring.y, ring.radius);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  for (const callout of state.callouts) {
    ctx.save();
    ctx.globalAlpha = clamp(callout.life / callout.maxLife, 0, 1);
    drawGlowText(ctx, callout.text, callout.x, callout.y, {
      size: callout.size,
      align: 'center',
      color: callout.color,
      glow: callout.color,
      blur: 14,
      stroke: 'rgba(4, 8, 16, 0.75)',
      strokeWidth: 3,
    });
    ctx.restore();
  }
}
