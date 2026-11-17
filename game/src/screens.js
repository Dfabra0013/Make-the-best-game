// The four full-screen moments a complete game must have: a title with rules and
// controls, a pause panel, and two distinct result screens with a visible restart.
import { FIELD, HUES, PALETTE } from './config.js';
import { text, roundRect } from './hud.js';

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(4,6,15,${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function panel(ctx, x, y, w, h, accent) {
  ctx.save();
  ctx.shadowColor = accent; ctx.shadowBlur = 40;
  roundRect(ctx, x, y, w, h, 22);
  ctx.fillStyle = 'rgba(8,11,24,0.92)'; ctx.fill();
  ctx.shadowBlur = 0;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(255,255,255,0.22)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.05)'); grad.addColorStop(1, accent);
  ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function titleGradient(ctx, x, w) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, HUES[0].hex); g.addColorStop(0.27, HUES[1].hex);
  g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.73, HUES[3].hex); g.addColorStop(1, HUES[4].hex);
  return g;
}

function emblem(ctx, time) {
  const cx = FIELD.cx, cy = 212;
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 148);
  glow.addColorStop(0, 'rgba(120,160,255,0.28)'); glow.addColorStop(1, 'rgba(120,160,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(cx - 160, cy - 160, 320, 320);
  ctx.translate(cx, cy); ctx.rotate(Math.sin(time * 0.5) * 0.12 - Math.PI / 2);
  const r = 74;
  const tri = (rot, color, alpha) => {
    ctx.save(); ctx.rotate(rot); ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  };
  tri(0, 'rgba(255,179,71,0.55)', 0.9);
  tri(Math.PI / 3, 'rgba(167,139,250,0.5)', 0.85);
  tri(-Math.PI / 3, 'rgba(79,214,232,0.5)', 0.85);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  for (let i = 0; i < HUES.length; i += 1) {
    const a = time * 0.6 + (i / HUES.length) * Math.PI * 2;
    const rr = 112 + Math.sin(time + i) * 5;
    ctx.fillStyle = HUES[i].hex;
    ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function statLine(ctx, label, value, x, y, color) {
  text(ctx, label, x, y, 13, PALETTE.muted, 'left', 700);
  text(ctx, value, x, y + 30, 25, color || PALETTE.ink, 'left', 800);
}

export function drawTitle(ctx, state, time) {
  dim(ctx, 0.55);
  emblem(ctx, time);
  ctx.save();
  ctx.shadowColor = 'rgba(120,180,255,0.7)'; ctx.shadowBlur = 26;
  ctx.font = `800 76px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = titleGradient(ctx, FIELD.cx, 620);
  ctx.fillText('PRISMWAKE', FIELD.cx, 396);
  ctx.restore();
  text(ctx, 'THE GREY TOOK THE COLOUR. TAKE IT BACK.', FIELD.cx, 430, 18, PALETTE.ink, 'center', 700);
  text(ctx, 'Collect 18 shards of the lit hue to restore it. Restore all five before dawn breaks.',
    FIELD.cx, 460, 15, PALETTE.muted, 'center', 600);

  panel(ctx, 286, 486, 708, 96, 'rgba(120,160,255,0.35)');
  text(ctx, 'MOUSE / WASD', 316, 516, 14, HUES[0].hex, 'left', 800);
  text(ctx, 'STEER THE PRISM', 470, 516, 14, PALETTE.ink, 'left', 600);
  text(ctx, 'SPACE / CLICK', 316, 548, 14, HUES[3].hex, 'left', 800);
  text(ctx, 'REFRACT BURST', 470, 548, 14, PALETTE.ink, 'left', 600);
  text(ctx, 'SHIFT', 686, 516, 14, HUES[2].hex, 'left', 800);
  text(ctx, 'DASH', 770, 516, 14, PALETTE.ink, 'left', 600);
  text(ctx, 'P / M / R', 686, 548, 14, HUES[4].hex, 'left', 800);
  text(ctx, 'PAUSE  SOUND  RESTART', 770, 548, 14, PALETTE.ink, 'left', 600);

  text(ctx, `BEST  ${String(state.best).padStart(6, '0')}`, FIELD.cx, 620, 15, PALETTE.muted, 'center', 700);
  const pulse = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS SPACE OR CLICK TO BEGIN', FIELD.cx, 660, 22, '#ffffff', 'center', 800);
  ctx.globalAlpha = 1;

  // The five hues the run will restore.
  for (let i = 0; i < HUES.length; i += 1) {
    const x = FIELD.cx - 232 + i * 116;
    const hue = HUES[i];
    ctx.save(); ctx.translate(x, 694); ctx.rotate(Math.PI / 4 + time * 0.4);
    ctx.fillStyle = hue.hex; ctx.shadowColor = hue.hex; ctx.shadowBlur = 12;
    ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    text(ctx, hue.name, x, 712, 10, hue.hex, 'center', 700);
  }
}

export function drawPaused(ctx) {
  dim(ctx, 0.62);
  panel(ctx, 430, 262, 420, 196, 'rgba(120,160,255,0.5)');
  text(ctx, 'PAUSED', FIELD.cx, 342, 46, '#ffffff', 'center', 800);
  text(ctx, 'The grey is holding its breath.', FIELD.cx, 378, 16, PALETTE.muted, 'center', 600);
  text(ctx, 'PRESS P OR SPACE TO RESUME', FIELD.cx, 420, 16, HUES[3].hex, 'center', 800);
}

function resultPanel(ctx, state, heading, subtitle, accent, victory) {
  dim(ctx, 0.68);
  const x = 250, y = 118, w = 780, h = 486;
  panel(ctx, x, y, w, h, accent);
  ctx.save();
  ctx.shadowColor = accent; ctx.shadowBlur = 26;
  ctx.font = `800 54px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = victory ? titleGradient(ctx, FIELD.cx, 660) : accent;
  ctx.fillText(heading, FIELD.cx, 200);
  ctx.restore();
  text(ctx, subtitle, FIELD.cx, 236, 17, PALETTE.ink, 'center', 600);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 60, 258); ctx.lineTo(x + w - 60, 258); ctx.stroke();

  const left = x + 74, right = x + 430;
  statLine(ctx, 'FINAL SCORE', String(state.score).padStart(6, '0'), left, 300, victory ? HUES[0].hex : accent);
  statLine(ctx, 'BEST SCORE', String(state.best).padStart(6, '0'), right, 300, PALETTE.ink);
  statLine(ctx, 'HUES RESTORED', `${state.restored.length} / 5`, left, 372, HUES[3].hex);
  statLine(ctx, 'SHARDS COLLECTED', String(state.stats.shards), right, 372, PALETTE.ink);
  statLine(ctx, 'NULLS CONVERTED', String(state.stats.conversions), left, 444, HUES[2].hex);
  statLine(ctx, 'REFRACT BURSTS', String(state.stats.refracts), right, 444, PALETTE.ink);

  text(ctx, victory ? `TIME LEFT  ${Math.floor(state.dawn)}s` : `DAWN BROKE WITH ${5 - state.restored.length} HUES LOST`,
    FIELD.cx, 506, 15, PALETTE.muted, 'center', 700);
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 320);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', FIELD.cx, 562, 22, '#ffffff', 'center', 800);
  ctx.globalAlpha = 1;
}

export function drawVictory(ctx, state) {
  resultPanel(ctx, state, 'SPECTRUM RESTORED', 'The five hues burn again. The grey has no hold here.', HUES[4].hex, true);
}

export function drawDefeat(ctx, state) {
  const cause = state.integrity <= 0 ? 'Your prism shattered against the Null.' : 'Dawn broke before the hues returned.';
  resultPanel(ctx, state, 'THE GREY DAWN', cause, PALETTE.danger, false);
}
