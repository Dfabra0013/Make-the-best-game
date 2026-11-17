// The readout the fox plays by: which dusk it is and how many wisps are still
// out, the time left before nightfall, the hearts and the wick, and the score with
// the streak it is holding. Everything sits in the sky, so the meadow stays clear.

import { TAU, clamp, drawText, fillRoundRect, formatNumber, glowBall, mixColor, radialFill, rgba, strokeRoundRect } from '../engine/draw.js';
import { FONT_DISPLAY, FONT_UI } from '../engine/draw.js';
import { STAGE } from './layout.js';
import { drawLabel, drawLanternHearts, drawPanel, drawWickBar } from './ui.js';

export function drawHud(ctx, hud, palette, time) {
  drawDuskPanel(ctx, hud, palette);
  drawVitalsPanel(ctx, hud, palette, time);
  drawTimerDial(ctx, hud, palette, time);
  drawScorePanel(ctx, hud, palette, time);
  if (hud.combo > 1) drawStreakPill(ctx, hud, palette, time);
  if (hud.secondsLeft <= 10 && hud.secondsLeft > 0) drawNightfallWarning(ctx, hud, palette, time);
}

function drawDuskPanel(ctx, hud, palette) {
  const x = 28;
  const y = 22;
  const w = 326;
  const h = 96;
  drawPanel(ctx, x, y, w, h, palette);
  drawLabel(ctx, `Dusk ${hud.duskNumber} of ${hud.duskTotal}`, x + 22, y + 26, palette);
  drawText(ctx, `${hud.delivered}/${hud.goal}`, x + w - 22, y + 28, {
    font: `600 22px ${FONT_DISPLAY}`,
    fill: palette.accent,
    align: 'right',
  });
  const nameSize = hud.duskName.length > 14 ? 24 : 28;
  drawText(ctx, hud.duskName, x + 22, y + 62, {
    font: `600 ${nameSize}px ${FONT_DISPLAY}`,
    fill: palette.text,
  });

  const pipY = y + 82;
  const spacing = hud.goal > 9 ? 10.5 : 12.5;
  for (let i = 0; i < hud.goal; i += 1) {
    const filled = i < hud.delivered;
    const cx = x + 22 + i * spacing;
    if (filled) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glowBall(ctx, cx, pipY, 11, palette.wisp, 0.6, 0.1);
      ctx.restore();
    }
    ctx.fillStyle = filled ? rgba(mixColor(palette.wisp, '#ffffff', 0.45), 0.95) : rgba(palette.dim, 0.22);
    ctx.beginPath();
    ctx.arc(cx, pipY, hud.goal > 9 ? 3.2 : 4, 0, TAU);
    ctx.fill();
  }

  drawLabel(ctx, 'wisps home', x + w - 22, y + 84, palette, { align: 'right', alpha: 0.6 });
}

function drawVitalsPanel(ctx, hud, palette, time) {
  const x = 28;
  const y = 130;
  const w = 326;
  const h = 62;
  drawPanel(ctx, x, y, w, h, palette);
  drawLanternHearts(ctx, x + 26, y + 32, hud.hearts, hud.maxHearts, palette, time);

  drawLabel(ctx, 'wick', x + 172, y + 22, palette, { alpha: 0.75 });
  const low = hud.wickFraction < 0.28;
  drawWickBar(ctx, x + 172, y + 28, 130, 11, hud.wickFraction, palette, time, low);

  drawLabel(ctx, 'dash', x + 172, y + 52, palette, { alpha: hud.dashReady ? 0.8 : 0.35 });
  fillRoundRect(ctx, x + 216, y + 46, 86, 6, 3, rgba(palette.dim, 0.25));
  fillRoundRect(
    ctx,
    x + 216,
    y + 46,
    86 * (hud.dashReady ? 1 : clamp(hud.dashCharge, 0, 1)),
    6,
    3,
    rgba(hud.dashReady ? palette.accent : palette.dim, hud.dashReady ? 0.95 : 0.5),
  );
}

function drawTimerDial(ctx, hud, palette, time) {
  const cx = STAGE.width / 2;
  const cy = 96;
  const radius = 46;
  const fraction = clamp(hud.secondsLeft / hud.secondsTotal, 0, 1);
  const urgent = hud.secondsLeft <= 10;
  const start = Math.PI * 0.78;
  const sweep = Math.PI * 1.44;

  drawLabel(ctx, 'till nightfall', cx, 26, palette, { align: 'center', alpha: 0.7 });

  ctx.save();
  ctx.fillStyle = radialFill(ctx, cx, cy, 12, radius * 1.8, [
    [0, rgba(palette.groundLow, 0.42)],
    [1, rgba(palette.groundLow, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(palette.text, 0.12);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, start + sweep);
  ctx.stroke();

  ctx.strokeStyle = urgent ? rgba(palette.houndEye, 0.95) : rgba(palette.accent, 0.92);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, start + sweep * Math.max(0.001, fraction));
  ctx.stroke();

  if (urgent) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowBall(ctx, cx, cy, radius * 1.5, palette.houndEye, 0.14 + Math.sin(time * 9) * 0.07, 0.02);
    ctx.restore();
  }

  drawText(ctx, String(Math.max(0, Math.ceil(hud.secondsLeft))), cx, cy + 2, {
    font: `600 38px ${FONT_DISPLAY}`,
    fill: urgent ? mixColor(palette.houndEye, '#ffffff', 0.4) : palette.text,
    align: 'center',
    baseline: 'middle',
  });
}

function drawScorePanel(ctx, hud, palette, time) {
  const x = STAGE.width - 354;
  const y = 22;
  const w = 326;
  const h = 96;
  drawPanel(ctx, x, y, w, h, palette);
  drawLabel(ctx, 'score', x + w - 24, y + 26, palette, { align: 'right' });
  drawText(ctx, formatNumber(hud.score), x + w - 24, y + 70, {
    font: `600 42px ${FONT_DISPLAY}`,
    fill: palette.text,
    align: 'right',
  });
  drawLabel(ctx, hud.best > hud.score ? `best ${formatNumber(hud.best)}` : 'a new best', x + w - 24, y + 88, palette, {
    align: 'right',
    alpha: hud.best > hud.score ? 0.5 : 0.85,
  });

  // The fox's own little lamp, so the panel is not just numerals.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowBall(ctx, x + 46, y + 48, 30, palette.lantern, 0.34 + Math.sin(time * 2.1) * 0.05, 0.06);
  ctx.restore();
  ctx.strokeStyle = rgba(palette.foxDeep, 0.85);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 46, y + 32);
  ctx.lineTo(x + 46, y + 38);
  ctx.stroke();
  fillRoundRect(ctx, x + 39, y + 38, 14, 18, 4, rgba(mixColor(palette.lantern, '#ffffff', 0.18), 0.92));
  strokeRoundRect(ctx, x + 39, y + 38, 14, 18, 4, rgba(palette.sun, 0.7), 1.1);
}

function drawStreakPill(ctx, hud, palette, time) {
  const x = STAGE.width - 354;
  const y = 130;
  const w = 150;
  const h = 44;
  const heat = clamp(1 - hud.comboTimer / hud.comboWindow, 0, 1);
  fillRoundRect(ctx, x + 326 - w, y, w, h, 12, rgba(palette.groundLow, 0.5));
  strokeRoundRect(ctx, x + 326 - w, y, w, h, 12, rgba(palette.accent, 0.35 + heat * 0.45), 1.3);
  drawText(ctx, `x${hud.combo}`, x + 326 - w + 34, y + h / 2 + 1, {
    font: `600 28px ${FONT_DISPLAY}`,
    fill: mixColor(palette.accent, '#ffffff', heat * 0.55),
    align: 'center',
    baseline: 'middle',
  });
  drawLabel(ctx, 'streak', x + 326 - w + 62, y + 26, palette, { alpha: 0.8 });
  fillRoundRect(ctx, x + 326 - w + 62, y + 32, 62 * (1 - heat), 3.5, 1.75, rgba(palette.accent, 0.75));
}

function drawNightfallWarning(ctx, hud, palette, time) {
  const pulse = 0.3 + Math.sin(time * 7.5) * 0.28;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = rgba(palette.houndEye, 0.6);
  ctx.lineWidth = 7;
  ctx.strokeRect(3.5, 3.5, STAGE.width - 7, STAGE.height - 7);
  ctx.restore();
  drawText(ctx, 'NIGHTFALL', STAGE.width / 2, 158, {
    font: `700 14px ${FONT_UI}`,
    fill: rgba(mixColor(palette.houndEye, '#ffffff', 0.35), pulse + 0.3),
    align: 'center',
    letterSpacing: 6,
  });
}
