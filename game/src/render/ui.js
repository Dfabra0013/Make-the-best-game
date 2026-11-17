// The furniture of the interface: panels that sit over the meadow, the lantern
// hearts, the keycaps on the controls line, the title lockup and the charm cards.
// One place for it keeps every screen looking like the same game.

import { TAU, clamp, drawText, easeOutBack, fillRoundRect, glowBall, linearFill, mixColor, radialFill, rgba, strokeRoundRect, textWidth } from '../engine/draw.js';
import { FONT_DISPLAY, FONT_UI } from '../engine/draw.js';
import { STAGE } from './layout.js';

/** A translucent panel with a hairline edge: the frame every readout sits in. */
export function drawPanel(ctx, x, y, w, h, palette, opts = {}) {
  const { radius = 14, fill = 0.46, edge = 0.16, glow = 0 } = opts;
  fillRoundRect(ctx, x, y, w, h, radius, rgba(palette.groundLow, fill));
  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = rgba(palette.accent, glow);
    ctx.shadowBlur = 18 + glow * 20;
  }
  strokeRoundRect(ctx, x, y, w, h, radius, rgba(palette.text, edge), 1.2);
  ctx.restore();
}

/** A small label in the game's voice: letterspaced small caps. */
export function drawLabel(ctx, value, x, y, palette, opts = {}) {
  drawText(ctx, value.toUpperCase(), x, y, {
    font: `700 11px ${FONT_UI}`,
    fill: rgba(palette.dim, opts.alpha ?? 0.9),
    letterSpacing: 2.2,
    align: opts.align ?? 'left',
    baseline: 'alphabetic',
  });
}

/** The lantern hearts: one per life, dark and hollow once spent. */
export function drawLanternHearts(ctx, x, y, filled, total, palette, time) {
  for (let i = 0; i < total; i += 1) {
    const cx = x + i * 26;
    const lit = i < filled;
    const flicker = lit ? 0.85 + Math.sin(time * 5 + i * 1.7) * 0.15 : 0;
    ctx.save();
    if (lit) {
      ctx.globalCompositeOperation = 'lighter';
      glowBall(ctx, cx, y, 18, palette.lantern, 0.4 * flicker, 0.1);
    }
    // The lantern body: a rounded flask with a lid and a hook.
    ctx.strokeStyle = rgba(lit ? palette.accent : palette.dim, lit ? 0.95 : 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 5, y - 6);
    ctx.lineTo(cx + 5, y - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, y - 9);
    ctx.lineTo(cx, y - 6);
    ctx.stroke();
    fillRoundRect(ctx, cx - 7, y - 6, 14, 16, 4, lit ? rgba(mixColor(palette.lantern, '#ffffff', 0.15), 0.95) : rgba(palette.groundLow, 0.75));
    strokeRoundRect(ctx, cx - 7, y - 6, 14, 16, 4, rgba(lit ? palette.sun : palette.dim, lit ? 0.8 : 0.3), 1.2);
    if (lit) {
      ctx.fillStyle = rgba('#ffffff', 0.9);
      ctx.beginPath();
      ctx.ellipse(cx, y + 2, 2.4, 3.6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** A keycap, as the controls line shows them. */
export function drawKeycap(ctx, x, y, label, palette, width = null) {
  const w = width ?? Math.max(24, textWidth(ctx, label, `700 12px ${FONT_UI}`) + 16);
  fillRoundRect(ctx, x, y - 14, w, 22, 6, rgba(palette.text, 0.1));
  strokeRoundRect(ctx, x, y - 14, w, 22, 6, rgba(palette.text, 0.28), 1.1);
  drawText(ctx, label, x + w / 2, y + 2, {
    font: `700 12px ${FONT_UI}`,
    fill: rgba(palette.text, 0.92),
    align: 'center',
    baseline: 'middle',
  });
  return w;
}

/** The title: WISPWOOD over the dusk, with the fox's own light behind it. */
export function drawTitleLockup(ctx, palette, time, opts = {}) {
  const { cx = STAGE.width / 2, top = 118, scale = 1 } = opts;
  const title = 'WISPWOOD';
  const size = Math.round(96 * scale);
  const gap = 6 * scale;
  ctx.save();
  ctx.font = `600 ${size}px ${FONT_DISPLAY}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${gap}px`;
  const widths = [...title].map((letter) => ctx.measureText(letter).width + gap);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  ctx.textBaseline = 'alphabetic';

  // A wash of warm light behind the word.
  ctx.globalCompositeOperation = 'lighter';
  glowBall(ctx, cx, top - size * 0.28, size * 2.1, palette.lantern, 0.16, 0.02);
  ctx.globalCompositeOperation = 'source-over';

  let index = 0;
  for (const letter of title) {
    const bounce = Math.sin(time * 1.1 + index * 0.55) * 2.2;
    const y = top + bounce;
    ctx.font = `600 ${size}px ${FONT_DISPLAY}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${gap}px`;
    ctx.fillStyle = rgba(palette.groundLow, 0.55);
    ctx.fillText(letter, x + 2, y + 5);
    ctx.fillStyle = mixColor(palette.text, palette.sun, 0.25 + (index % 3) * 0.08);
    ctx.fillText(letter, x, y);
    ctx.fillStyle = rgba(palette.sun, 0.18);
    ctx.fillText(letter, x, y - 2);
    x += widths[index];
    index += 1;
  }
  ctx.restore();

  // The rule under the title, with a lantern at its centre.
  const ruleY = top + 34 * scale;
  const half = Math.min(360 * scale, total * 0.52);
  ctx.strokeStyle = rgba(palette.accent, 0.42);
  ctx.lineWidth = 1.2;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 26 * scale, ruleY);
    ctx.lineTo(cx + dir * half, ruleY);
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowBall(ctx, cx, ruleY, 16 * scale, palette.lantern, 0.6, 0.2);
  ctx.restore();

  drawText(ctx, opts.subtitle ?? 'herd the light home before nightfall', cx, ruleY + 34 * scale, {
    font: `400 ${Math.round(23 * scale)}px ${FONT_DISPLAY}`,
    fill: rgba(palette.dim, 0.95),
    align: 'center',
    letterSpacing: 1.2,
  });
}

/** A charm card: the choice between dusks. */
export function drawCharmCard(ctx, charm, x, y, w, h, palette, opts = {}) {
  const { hovered = false, time = 0, index = 0, picked = false } = opts;
  const lift = hovered ? -8 - Math.sin(time * 3) * 2 : 0;
  const top = y + lift;

  ctx.save();
  ctx.shadowColor = rgba(palette.groundLow, 0.6);
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  fillRoundRect(ctx, x, top, w, h, 18, rgba(mixColor(palette.groundTop, palette.groundLow, 0.5), 0.9));
  ctx.restore();

  const edge = hovered || picked ? palette.accent : palette.dim;
  strokeRoundRect(ctx, x, top, w, h, 18, rgba(edge, hovered || picked ? 0.75 : 0.24), hovered || picked ? 1.8 : 1.2);

  if (hovered || picked) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowBall(ctx, x + w / 2, top + 34, w * 0.42, palette.lantern, 0.16, 0.02);
    ctx.restore();
  }

  // The card's sigil, drawn from the charm's icon name.
  drawCharmIcon(ctx, charm.icon, x + w / 2, top + 64, palette, hovered || picked);

  drawText(ctx, charm.name, x + w / 2, top + 132, {
    font: `600 30px ${FONT_DISPLAY}`,
    fill: palette.text,
    align: 'center',
  });
  drawWrappedText(ctx, charm.idea, x + 26, top + 164, w - 52, 22, {
    font: `400 15px ${FONT_UI}`,
    fill: rgba(palette.dim, 0.98),
    align: 'center',
  });

  drawText(ctx, String(index + 1), x + w - 22, top + h - 18, {
    font: `700 13px ${FONT_UI}`,
    fill: rgba(palette.accent, hovered || picked ? 0.95 : 0.5),
    align: 'right',
  });
  drawText(ctx, 'take', x + 22, top + h - 18, {
    font: `700 11px ${FONT_UI}`,
    fill: rgba(palette.text, hovered || picked ? 0.8 : 0.28),
    letterSpacing: 2,
  });
}

function drawCharmIcon(ctx, icon, cx, cy, palette, lit) {
  const ink = lit ? palette.accent : mixColor(palette.dim, palette.accent, 0.35);
  ctx.save();
  ctx.strokeStyle = rgba(ink, 0.95);
  ctx.fillStyle = rgba(ink, 0.95);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  if (lit) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowBall(ctx, cx, cy, 52, palette.lantern, 0.25, 0.08);
    ctx.restore();
  }
  switch (icon) {
    case 'beam':
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy + 18);
      ctx.lineTo(cx + 26, cy - 22);
      ctx.moveTo(cx - 30, cy + 18);
      ctx.lineTo(cx + 20, cy + 2);
      ctx.moveTo(cx - 30, cy + 18);
      ctx.lineTo(cx + 12, cy + 22);
      ctx.stroke();
      break;
    case 'wick':
      ctx.strokeRect(cx - 14, cy - 26, 28, 42);
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 4);
      ctx.lineTo(cx + 14, cy - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy - 14, 6, 9, 0, 0, TAU);
      ctx.fill();
      break;
    case 'paw':
      for (const [dx, dy, r] of [[-12, 6, 5], [0, 10, 6], [12, 6, 5], [-8, -8, 4], [8, -8, 4]]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, r, 0, TAU);
        ctx.fill();
      }
      break;
    case 'flare':
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * TAU;
        const r0 = 10 + (i % 2) * 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
        ctx.stroke();
      }
      break;
    case 'nose':
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 3, 2.4, 0, TAU);
      ctx.arc(cx + 6, cy - 3, 2.4, 0, TAU);
      ctx.fill();
      break;
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(cx, cy + 20);
      ctx.bezierCurveTo(cx - 30, cy - 2, cx - 16, cy - 26, cx, cy - 12);
      ctx.bezierCurveTo(cx + 16, cy - 26, cx + 30, cy - 2, cx, cy + 20);
      ctx.fill();
      break;
    case 'step':
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(cx - 16 + i * 16, cy + 8 - i * 10, 5, 3.4, -0.4, 0, TAU);
        ctx.fill();
      }
      break;
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, TAU);
      ctx.stroke();
  }
  ctx.restore();
}

/** Text that wraps inside a column, in the current voice. */
export function drawWrappedText(ctx, value, x, y, maxWidth, lineHeight, opts = {}) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    ctx.save();
    ctx.font = opts.font;
    const tooWide = ctx.measureText(next).width > maxWidth;
    ctx.restore();
    if (tooWide && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  lines.forEach((text, index) => {
    drawText(ctx, text, x, y + index * lineHeight, { ...opts, baseline: 'alphabetic' });
  });
  return lines.length;
}

/** A wide button, used by the results and title screens. */
export function drawButton(ctx, label, x, y, w, h, palette, opts = {}) {
  const { hovered = false, time = 0 } = opts;
  const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;
  fillRoundRect(ctx, x, y, w, h, 12, rgba(palette.accent, hovered ? 0.22 : 0.1 + pulse * 0.05));
  strokeRoundRect(ctx, x, y, w, h, 12, rgba(palette.accent, hovered ? 0.9 : 0.4 + pulse * 0.2), 1.4);
  drawText(ctx, label, x + w / 2, y + h / 2 + 1, {
    font: `600 22px ${FONT_DISPLAY}`,
    fill: palette.text,
    align: 'center',
    baseline: 'middle',
  });
}

/** The bar that shows how much wick is left, with a lantern head at its left. */
export function drawWickBar(ctx, x, y, w, h, fraction, palette, time, low = false) {
  const trim = clamp(fraction, 0, 1);
  fillRoundRect(ctx, x, y, w, h, h / 2, rgba(palette.groundLow, 0.75));
  const fill = trim > 0 ? linearFill(ctx, x, y, x + w, y, [
    [0, rgba(low ? palette.houndEye : palette.accent, 0.85)],
    [1, rgba(low ? mixColor(palette.houndEye, palette.sun, 0.4) : palette.sun, 0.95)],
  ]) : rgba(palette.groundLow, 0.4);
  if (trim > 0.01) {
    fillRoundRect(ctx, x + 1, y + 1, Math.max(h - 2, (w - 2) * trim), h - 2, (h - 2) / 2, fill);
  }
  strokeRoundRect(ctx, x, y, w, h, h / 2, rgba(palette.text, 0.22), 1);
  if (low) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(time * 8) * 0.25;
    ctx.strokeStyle = rgba(palette.houndEye, 0.9);
    strokeRoundRect(ctx, x - 1, y - 1, w + 2, h + 2, h / 2 + 1, rgba(palette.houndEye, 0.8), 1.4);
    ctx.restore();
  }
}

/** The soft dark at the very top and bottom of a menu screen. */
export function drawScreenShade(ctx, palette, strength = 0.55) {
  ctx.fillStyle = radialFill(ctx, STAGE.width / 2, STAGE.height / 2, STAGE.height * 0.3, STAGE.width * 0.8, [
    [0, rgba(palette.groundLow, 0)],
    [1, rgba(palette.groundLow, strength)],
  ]);
  ctx.fillRect(0, 0, STAGE.width, STAGE.height);
}
