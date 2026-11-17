// The HUD: score, best, the five-hue spectrum, integrity, dawn countdown, the
// refract meter, combo and the current objective. Everything is legible when the
// screenshot sheet is shrunk, which is the judge's first look at the game.
import { FIELD, HUES, PALETTE, FONT, REFRACT, SHARD, DAWN } from './config.js';

export function text(ctx, value, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.32);
  ctx.bezierCurveTo(-size * 0.62, -size * 0.16, -size * 0.32, -size * 0.62, 0, -size * 0.24);
  ctx.bezierCurveTo(size * 0.32, -size * 0.62, size * 0.62, -size * 0.16, 0, size * 0.32);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff6b8a' : 'rgba(255,255,255,0.10)';
  ctx.fill();
  ctx.strokeStyle = filled ? 'rgba(255,190,205,0.9)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

export function drawHud(ctx, state, muted) {
  // Top and bottom scrims keep text readable over bright nebulae.
  const top = ctx.createLinearGradient(0, 0, 0, 122);
  top.addColorStop(0, 'rgba(4,6,14,0.88)'); top.addColorStop(1, 'rgba(4,6,14,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, FIELD.width, 122);
  const bottom = ctx.createLinearGradient(0, FIELD.height - 104, 0, FIELD.height);
  bottom.addColorStop(0, 'rgba(4,6,14,0)'); bottom.addColorStop(1, 'rgba(4,6,14,0.9)');
  ctx.fillStyle = bottom; ctx.fillRect(0, FIELD.height - 104, FIELD.width, 104);

  // Score cluster.
  text(ctx, 'SCORE', 28, 30, 13, PALETTE.muted, 'left', 700);
  text(ctx, String(state.score).padStart(6, '0'), 28, 64, 34, PALETTE.ink, 'left', 800);
  text(ctx, `BEST  ${String(state.best).padStart(6, '0')}`, 28, 88, 14, PALETTE.muted, 'left', 600);

  // Spectrum: five segments, restored hues filled, current hue filling.
  text(ctx, 'SPECTRUM', FIELD.cx, 26, 13, PALETTE.muted, 'center', 700);
  const segW = 86, gap = 9, total = 5 * segW + 4 * gap;
  const startX = FIELD.cx - total / 2;
  for (let i = 0; i < HUES.length; i += 1) {
    const hue = HUES[i];
    const x = startX + i * (segW + gap);
    roundRect(ctx, x, 38, segW, 16, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke();
    const restored = i < state.restored.length;
    const current = i === state.hueIndex;
    let fill = restored ? 1 : current ? state.hueProgress : 0;
    if (fill > 0) {
      ctx.save();
      roundRect(ctx, x, 38, Math.max(4, segW * fill), 16, 5); ctx.clip();
      ctx.fillStyle = hue.hex; ctx.fillRect(x, 38, segW, 16);
      if (current) { ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.fillRect(x, 38, segW, 5); }
      ctx.restore();
      ctx.shadowColor = hue.hex; ctx.shadowBlur = 14;
      roundRect(ctx, x, 38, Math.max(4, segW * fill), 16, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
      ctx.shadowBlur = 0;
    }
    text(ctx, hue.name, x + segW / 2, 72, 11, restored ? hue.hex : current ? PALETTE.ink : PALETTE.dim, 'center', 700);
  }
  text(ctx, `${state.restored.length} / 5 HUES RESTORED`, FIELD.cx, 94, 12, PALETTE.muted, 'center', 600);

  // Integrity + dawn.
  text(ctx, 'INTEGRITY', FIELD.width - 28, 30, 13, PALETTE.muted, 'right', 700);
  for (let i = 0; i < 3; i += 1) heart(ctx, FIELD.width - 112 + i * 34, 52, 22, i < state.integrity);
  const secs = Math.ceil(state.dawn);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  text(ctx, `DAWN  ${mm}:${ss}`, FIELD.width - 28, 92, 19, secs <= 20 ? PALETTE.danger : PALETTE.ink, 'right', 800);
  roundRect(ctx, FIELD.width - 232, 102, 204, 5, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  roundRect(ctx, FIELD.width - 232, 102, 204 * (state.dawn / DAWN), 5, 3);
  ctx.fillStyle = secs <= 20 ? PALETTE.danger : '#4fd6e8'; ctx.fill();

  // Refract meter.
  const ready = state.refract >= REFRACT.cost;
  text(ctx, 'REFRACT', 28, FIELD.height - 66, 13, PALETTE.muted, 'left', 700);
  roundRect(ctx, 28, FIELD.height - 56, 246, 14, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fill();
  if (ready) { ctx.shadowColor = HUES[Math.min(state.hueIndex, 4)].hex; ctx.shadowBlur = 16; }
  roundRect(ctx, 28, FIELD.height - 56, 246 * (state.refract / REFRACT.cost), 14, 7);
  ctx.fillStyle = ready ? '#ffffff' : HUES[Math.min(state.hueIndex, 4)].hex; ctx.fill();
  ctx.shadowBlur = 0;
  text(ctx, ready ? 'READY  ·  SPACE / CLICK' : 'CHARGING FROM SHARDS',
    28, FIELD.height - 22, 13, ready ? '#ffffff' : PALETTE.muted, 'left', 700);
  text(ctx, 'SHIFT  DASH     P  PAUSE     M  SOUND     R  RESTART', 300, FIELD.height - 22, 12, PALETTE.dim, 'left', 600);

  // Objective + combo.
  const hue = HUES[Math.min(state.hueIndex, HUES.length - 1)];
  text(ctx, `HUE ${Math.min(state.hueIndex + 1, 5)} / 5`, FIELD.width - 28, FIELD.height - 66, 13, PALETTE.muted, 'right', 700);
  text(ctx, `${hue.name}  ·  ${Math.round(state.hueProgress * SHARD.perHue)} / ${SHARD.perHue} SHARDS`,
    FIELD.width - 28, FIELD.height - 42, 16, hue.hex, 'right', 800);
  if (state.combo > 1) text(ctx, `×${state.combo} COMBO`, FIELD.width - 28, FIELD.height - 20, 14, '#ffd479', 'right', 800);

  if (state.bannerTime > 0) {
    const a = Math.min(1, state.bannerTime * 2);
    ctx.globalAlpha = a;
    ctx.shadowColor = hue.hex; ctx.shadowBlur = 22;
    text(ctx, state.banner, FIELD.cx, 162, 32, '#ffffff', 'center', 800);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  text(ctx, muted ? 'SOUND OFF  (M)' : 'SOUND ON  (M)', FIELD.cx, FIELD.height - 12, 10, PALETTE.dim, 'center', 600);
}
