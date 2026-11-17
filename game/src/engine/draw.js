// Small drawing vocabulary shared by every scene: paths, glows, gradients,
// text, and the handful of easings the animation uses. Nothing here knows what
// a wisp or a hound is, so the scenes stay readable.

export const TAU = Math.PI * 2;

/** The two faces the game ships with (registered in style.css and by the render tools). */
export const FONT_DISPLAY = '"Wispwood Display", Georgia, serif';
export const FONT_UI = '"Wispwood Text", "Trebuchet MS", sans-serif';

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeOutBack = (t) => {
  const x = clamp(t, 0, 1);
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
export const easeInOutQuad = (t) => {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};

/** A step toward `target` of at most `maxDelta`. */
export function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

/** The shortest signed turn from angle a to angle b. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Turns `a` toward `b` by at most `maxStep` radians. */
export function turnToward(a, b, maxStep) {
  const d = angleDelta(a, b);
  return a + clamp(d, -maxStep, maxStep);
}

/** `#rrggbb` plus an alpha, as a canvas fill or stroke colour. */
export function rgba(hex, alpha = 1) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

/** A colour `t` of the way from `a` to `b`, both `#rrggbb`. */
export function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, clamp(t, 0, 1)));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** A linear gradient from a list of [offset, colour] stops. */
export function linearFill(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

/** A radial gradient from a list of [offset, colour] stops. */
export function radialFill(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

/** A round-rectangle path, without the newer ctx.roundRect so every browser draws it. */
export function roundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, radius, fill) {
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRoundRect(ctx, x, y, w, h, radius, stroke, lineWidth = 1) {
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/** A soft ball of light: bright in the middle, gone at the rim. */
export function glowBall(ctx, x, y, radius, color, alpha = 1, core = 0.18) {
  ctx.fillStyle = radialFill(ctx, x, y, radius * core, radius, [
    [0, rgba(color, alpha)],
    [0.45, rgba(color, alpha * 0.45)],
    [1, rgba(color, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

/** A single line of text with the options the game uses. */
export function drawText(ctx, value, x, y, opts = {}) {
  const {
    font = `600 32px ${FONT_DISPLAY}`,
    fill = '#fff',
    align = 'left',
    baseline = 'alphabetic',
    alpha = 1,
    letterSpacing = 0,
    shadow = 0,
    shadowColor = 'rgba(0,0,0,0.45)',
  } = opts;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha *= alpha;
  if (letterSpacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  if (shadow > 0) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadow;
    ctx.shadowOffsetY = Math.round(shadow / 4);
  }
  ctx.fillStyle = fill;
  ctx.fillText(value, x, y);
  ctx.restore();
}

/** How wide `value` is in the current font. */
export function textWidth(ctx, value, font) {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(value).width;
  ctx.restore();
  return w;
}

/** A chestnut, the game's unit of score: 1,240 -> "1,240". */
export function formatNumber(value) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** A path through a list of [x, y] points, straight or smoothed by midpoints. */
export function polylinePath(ctx, points, smooth = false) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  if (!smooth) {
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    return;
  }
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last[0], last[1]);
}
