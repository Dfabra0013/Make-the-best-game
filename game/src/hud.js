// In-arena heads-up display: vitals, score, combo, Echo/Overdrive meters, relics and boss bar.

import { ARENA_HEIGHT, ARENA_WIDTH, GAME_CONFIG } from './config.js';
import { clamp, TWO_PI } from './mathutil.js';
import { drawGlassPanel, drawGlowText, roundedRectPath } from './render.js';

const FONT = '700 12px "DejaVu Sans", "Segoe UI", Arial, sans-serif';

export function drawRelicIcon(ctx, icon, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.14);
  ctx.lineJoin = 'round';
  const s = size * 0.5;
  const path = (points, close = true) => {
    ctx.beginPath();
    points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    if (close) ctx.closePath();
  };

  if (icon === 'bolt') {
    path([[s * 0.2, -s], [-s * 0.55, s * 0.15], [0, s * 0.15], [-s * 0.2, s], [s * 0.6, -s * 0.2], [s * 0.05, -s * 0.2]]);
    ctx.fill();
  } else if (icon === 'clock') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.92, 0, TWO_PI);
    ctx.stroke();
    path([[0, 0], [0, -s * 0.62]], false);
    ctx.stroke();
    path([[0, 0], [s * 0.48, s * 0.2]], false);
    ctx.stroke();
  } else if (icon === 'shield') {
    path([[0, -s], [s * 0.86, -s * 0.5], [s * 0.7, s * 0.55], [0, s], [-s * 0.7, s * 0.55], [-s * 0.86, -s * 0.5]]);
    ctx.stroke();
  } else if (icon === 'echo') {
    ctx.beginPath();
    ctx.arc(-s * 0.3, 0, s * 0.62, -1.1, 1.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.3, 0, s * 0.62, Math.PI - 1.1, Math.PI + 1.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.16, 0, TWO_PI);
    ctx.fill();
  } else if (icon === 'prism') {
    path([[0, -s], [s * 0.92, s * 0.72], [-s * 0.92, s * 0.72]]);
    ctx.stroke();
    path([[0, -s], [0, s * 0.4]], false);
    ctx.stroke();
  } else if (icon === 'dash') {
    for (let i = 0; i < 3; i++) {
      path([[-s + i * s * 0.62, -s * 0.7], [-s * 0.3 + i * s * 0.62, 0], [-s + i * s * 0.62, s * 0.7]], false);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.92, 0, TWO_PI);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * TWO_PI + Math.PI / 4;
      path([[Math.cos(angle) * s * 0.62, Math.sin(angle) * s * 0.62], [Math.cos(angle) * s * 1.05, Math.sin(angle) * s * 1.05]], false);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawMeter(ctx, x, y, w, h, ratio, color, label, valueText, keyHint, pulse) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(6, 11, 22, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 186, 255, 0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#ffffff');
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
  if (pulse > 0) {
    ctx.globalAlpha = 0.16 * pulse;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  drawGlowText(ctx, label, x + 9, y + h / 2 + 4, { size: 10, color: 'rgba(226, 238, 255, 0.85)', letterSpacing: 1.1 });
  drawGlowText(ctx, valueText, x + w - 9, y + h / 2 + 4, { size: 10, align: 'right', color: '#f2f7ff' });
  if (keyHint) {
    drawGlowText(ctx, keyHint, x - 8, y + h / 2 + 4, { size: 10, align: 'right', color: 'rgba(180, 208, 255, 0.72)' });
  }
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, ratio, color, sheen) {
  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(4, 8, 18, 0.85)';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, sheen);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
  ctx.restore();
}

export function renderGameplayHud(ctx, state, time) {
  const player = state.player;
  const chassis = player.chassis;
  const hud = (text, x, y, size, color, extra = {}) => drawGlowText(ctx, text, x, y, { size, color, ...extra });

  ctx.save();
  const band = ctx.createLinearGradient(0, 0, 0, 92);
  band.addColorStop(0, 'rgba(3, 6, 14, 0.92)');
  band.addColorStop(0.7, 'rgba(4, 8, 18, 0.62)');
  band.addColorStop(1, 'rgba(4, 8, 18, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, ARENA_WIDTH, 92);

  hud(chassis.name, 26, 28, 15, chassis.primaryColor, { glow: chassis.primaryColor, blur: 10, letterSpacing: 2 });
  hud(`HULL ${Math.ceil(player.hull)} / ${player.maxHull}`, 26, 48, 10, 'rgba(214, 228, 250, 0.8)', { letterSpacing: 1 });
  const hullRatio = clamp(player.hull / player.maxHull, 0, 1);
  drawBar(ctx, 26, 54, 208, 14, hullRatio, hullRatio < 0.3 ? '#ff4d5e' : '#ffb547', hullRatio < 0.3 ? '#ff8f9a' : '#ffe6a2');
  drawBar(ctx, 26, 72, 208, 7, player.shield / player.maxShield, chassis.accentColor, chassis.accentColor);

  hud(`WAVE ${state.wave}${state.endlessMode ? '' : ' / ' + GAME_CONFIG.campaignTotalWaves}`, ARENA_WIDTH / 2, 32, 20, '#f6f9ff', {
    align: 'center',
    glow: state.realm.ringPrimary,
    blur: 12,
    letterSpacing: 3,
  });
  hud(state.realm.name, ARENA_WIDTH / 2, 52, 10, state.realm.ringSecondary, { align: 'center', letterSpacing: 2.6 });

  const remaining = state.enemies.length + state.spawnQueue.length;
  hud(remaining > 0 ? `HOSTILES ${remaining}` : 'SECTOR CLEAR', 26, 102, 10, 'rgba(190, 214, 245, 0.6)', { letterSpacing: 1.6 });

  hud(state.score.toLocaleString('en-US'), ARENA_WIDTH - 26, 40, 26, '#fffdf4', {
    align: 'right',
    glow: 'rgba(255, 205, 110, 0.7)',
    blur: 14,
  });
  hud(`BEST ${state.bestScore.toLocaleString('en-US')}`, ARENA_WIDTH - 26, 58, 10, 'rgba(198, 214, 244, 0.68)', {
    align: 'right',
    letterSpacing: 1.4,
  });

  const comboColor = state.combo >= 6 ? '#ff8ad1' : state.combo >= 3 ? '#ffd166' : '#9fe3ff';
  hud(`x${state.combo.toFixed(2)}`, ARENA_WIDTH - 26, 88, 20, comboColor, { align: 'right', glow: comboColor, blur: 12 });
  hud('COMBO', ARENA_WIDTH - 84, 86, 10, 'rgba(210, 226, 250, 0.62)', { align: 'right', letterSpacing: 1.6 });
  if (state.comboTimerSec > 0) {
    ctx.fillStyle = comboColor;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(ARENA_WIDTH - 154, 94, 128 * clamp(state.comboTimerSec / GAME_CONFIG.comboDecaySec, 0, 1), 3);
    ctx.globalAlpha = 1;
  }

  const echoReady = player.echoCharge >= GAME_CONFIG.echoSummonCost;
  drawMeter(ctx, 44, ARENA_HEIGHT - 74, 232, 16, player.echoCharge / GAME_CONFIG.echoChargeMax, '#3ee8ff',
    `TIME-ECHO ${Math.floor(player.echoCharge)}%`, echoReady ? 'READY' : 'CHARGING', 'Q',
    echoReady ? 0.6 + 0.4 * Math.sin(time * 6) : 0);
  const overdriveReady = player.overdriveCharge >= GAME_CONFIG.overdriveChargeMax;
  drawMeter(ctx, 44, ARENA_HEIGHT - 52, 170, 12, player.overdriveCharge / GAME_CONFIG.overdriveChargeMax, '#ffb347',
    'DRIVE', overdriveReady ? 'PRESS F' : ' ', '', overdriveReady ? 0.6 + 0.4 * Math.sin(time * 5) : 0);

  const dashCooldown = chassis.dashCooldownSec * (state.currentModifiers?.dashCooldownMul ?? 1);
  const dashRatio = 1 - clamp(player.dashTimer / dashCooldown, 0, 1);
  ctx.save();
  ctx.strokeStyle = dashRatio >= 1 ? chassis.accentColor : 'rgba(150, 180, 220, 0.35)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(246, ARENA_HEIGHT - 38, 11, -Math.PI / 2, -Math.PI / 2 + TWO_PI * clamp(dashRatio, 0, 1));
  ctx.stroke();
  hud('DASH', 246, ARENA_HEIGHT - 22, 7, 'rgba(190, 214, 245, 0.55)', { align: 'center' });
  ctx.restore();

  renderRelicLoadoutStrip(ctx, state);
  hud('WASD MOVE   MOUSE AIM   CLICK FIRE   SPACE DASH   Q ECHO   F OVERDRIVE   ESC PAUSE', ARENA_WIDTH / 2, ARENA_HEIGHT - 16, 10,
    'rgba(178, 200, 232, 0.5)', { align: 'center', letterSpacing: 1.6 });

  if (hullRatio < 0.3) {
    const warning = ctx.createRadialGradient(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 240, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 720);
    warning.addColorStop(0, 'rgba(0,0,0,0)');
    warning.addColorStop(1, `rgba(255, 40, 60, ${0.18 + 0.14 * Math.sin(time * 8)})`);
    ctx.fillStyle = warning;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    hud('HULL CRITICAL', ARENA_WIDTH / 2, 128, 16, '#ff8a9a', { align: 'center', glow: 'rgba(255, 60, 80, 0.9)', letterSpacing: 3 });
  }
  ctx.restore();
}

export function renderBossHealthBar(ctx, state, time) {
  const boss = state.enemies.find((enemy) => enemy.isBoss);
  if (!boss) return;
  const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  const width = 620;
  const x = (ARENA_WIDTH - width) / 2;
  const y = 84;

  drawGlassPanel(ctx, x - 16, y - 16, width + 32, 54, {
    radius: 10,
    accent: boss.color,
    border: 'rgba(255, 150, 170, 0.35)',
    top: 'rgba(38, 10, 22, 0.9)',
    bottom: 'rgba(14, 4, 10, 0.94)',
  });
  drawGlowText(ctx, boss.bossName, x + 4, y + 4, { size: 13, color: '#ffe6ec', glow: boss.color, blur: 10, letterSpacing: 2 });
  drawGlowText(ctx, `PHASE ${boss.phaseIndex + 1} / 3`, x + width - 4, y + 4, {
    size: 10,
    align: 'right',
    color: 'rgba(255, 214, 224, 0.72)',
    letterSpacing: 1.4,
  });

  roundedRectPath(ctx, x + 2, y + 12, width - 8, 15, 7.5);
  ctx.fillStyle = 'rgba(6, 4, 10, 0.92)';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
  gradient.addColorStop(0, boss.color);
  gradient.addColorStop(0.55, boss.accent);
  gradient.addColorStop(1, '#fff2c8');
  ctx.fillStyle = gradient;
  ctx.fillRect(x + 2, y + 12, (width - 8) * ratio, 15);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(x + ((time * 0.35) % 1) * width, y + 12, 46, 15);
  ctx.restore();
  for (let i = 1; i < 3; i++) {
    ctx.fillStyle = 'rgba(6, 4, 10, 0.8)';
    ctx.fillRect(x + 2 + ((width - 8) * i) / 3 - 1, y + 12, 2.4, 15);
  }
}

export function renderRelicLoadoutStrip(ctx, state) {
  const baseX = ARENA_WIDTH - 36;
  const y = ARENA_HEIGHT - 52;
  drawGlowText(ctx, state.relics.length > 0 ? `CHRONO-RELICS  ${state.relics.length}` : 'NO RELICS FORGED', baseX, y - 24, {
    size: 9,
    align: 'right',
    color: 'rgba(190, 214, 245, 0.6)',
    letterSpacing: 1.4,
  });
  state.relics.slice(-10).reverse().forEach((relic, i) => {
    const tierColor = relic.tier === 3 ? '#ffd166' : relic.tier === 2 ? '#c79bff' : '#7fe3ff';
    ctx.save();
    ctx.translate(baseX - 18 - i * 40, y);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const angle = (k / 6) * TWO_PI + Math.PI / 6;
      const px = Math.cos(angle) * 16;
      const py = Math.sin(angle) * 16;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 18, 34, 0.92)';
    ctx.fill();
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    drawRelicIcon(ctx, relic.icon, 0, 0, 13, tierColor);
    ctx.restore();
  });
}

export function renderWaveBanner(ctx, state) {
  const banner = state.banner;
  if (!banner || banner.timerSec <= 0) return;
  const progress = 1 - banner.timerSec / banner.totalSec;
  ctx.save();
  ctx.globalAlpha = Math.min(clamp(progress * 6, 0, 1), clamp((banner.timerSec / banner.totalSec) * 3.4, 0, 1));
  ctx.translate(0, (1 - clamp(progress * 6, 0, 1)) * 24);
  const width = 560;
  const x = (ARENA_WIDTH - width) / 2;
  drawGlassPanel(ctx, x, 132, width, 66, {
    radius: 12,
    accent: banner.accent,
    top: 'rgba(10, 18, 36, 0.82)',
    bottom: 'rgba(5, 9, 20, 0.9)',
    border: 'rgba(140, 186, 255, 0.25)',
  });
  drawGlowText(ctx, banner.title, ARENA_WIDTH / 2, 164, {
    size: 22,
    align: 'center',
    color: '#ffffff',
    glow: banner.accent,
    blur: 18,
    letterSpacing: 4,
  });
  drawGlowText(ctx, banner.subtitle, ARENA_WIDTH / 2, 185, {
    size: 11,
    align: 'center',
    color: 'rgba(206, 224, 250, 0.78)',
    letterSpacing: 2.4,
  });
  ctx.restore();
  void FONT;
}
