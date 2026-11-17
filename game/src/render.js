// All of Prismwake's world art: the colour-starved backdrop, the restored-hue
// nebulae, the dark Null wisps, the light shards and the player's prism skimmer.
import { FIELD, HUES, PALETTE, SHARD } from './config.js';

const TAU = Math.PI * 2;

function rgba(rgb, a) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; }

function makeStars() {
  const stars = [];
  let seed = 20261117;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 170; i += 1) {
    stars.push({ x: rnd() * FIELD.width, y: rnd() * FIELD.height, r: 0.5 + rnd() * 1.6, p: rnd() * TAU, s: 0.4 + rnd() * 1.3 });
  }
  return stars;
}
const STARS = makeStars();

function polygon(ctx, x, y, radius, sides, rotation, fill, stroke, lineWidth) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * TAU;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 2; ctx.stroke(); }
}

function radial(ctx, x, y, r, color, inner) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, color);
  return g;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, width: 0, height: 0 };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    canvas.width = w; canvas.height = h;
    view.width = w; view.height = h;
    view.scale = Math.min(w / FIELD.width, h / FIELD.height);
    view.x = (w - FIELD.width * view.scale) / 2;
    view.y = (h - FIELD.height * view.scale) / 2;
  }

  function backdrop(state, time) {
    ctx.fillStyle = PALETTE.void;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const base = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    base.addColorStop(0, '#090d1c'); base.addColorStop(0.55, '#0a1024'); base.addColorStop(1, '#05070f');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const s of STARS) {
      const tw = 0.35 + 0.35 * Math.sin(time * s.s + s.p);
      ctx.fillStyle = `rgba(190,205,255,${0.12 + tw * 0.35})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }

    // Each restored hue paints a soft nebula and a horizon band. The world literally
    // gains colour as the player succeeds; a victory screen shows all five at once.
    const anchors = [
      [240, 250], [1040, 220], [640, 560], [250, 560], [1030, 560],
    ];
    for (let i = 0; i < state.restored.length; i += 1) {
      const hue = HUES[state.restored[i]];
      const [ax, ay] = anchors[state.restored[i]];
      const g = radial(ctx, ax, ay, 430, rgba(hue.rgb, 0), rgba(hue.rgb, 0.20 + 0.04 * Math.sin(time + i)));
      ctx.fillStyle = g; ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const band = ctx.createLinearGradient(0, FIELD.height - 150, 0, FIELD.height);
      band.addColorStop(0, rgba(hue.rgb, 0)); band.addColorStop(1, rgba(hue.rgb, 0.10));
      ctx.fillStyle = band; ctx.fillRect(0, FIELD.height - 150, FIELD.width, 150);
    }
    // Dim guide grid keeps the arena reading as a place.
    ctx.strokeStyle = 'rgba(130,155,235,0.045)'; ctx.lineWidth = 1;
    for (let x = 80; x < FIELD.width; x += 80) { ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, FIELD.height - 50); ctx.stroke(); }
    for (let y = 70; y < FIELD.height - 40; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke(); }
  }

  function flora(state, time) {
    const spots = [[130, 170, 1.0], [1150, 160, 0.8], [1090, 500, 1.2], [170, 520, 0.9], [640, 130, 0.7]];
    for (let i = 0; i < state.restored.length; i += 1) {
      const idx = state.restored[i]; const hue = HUES[idx];
      const [x, y, m] = spots[idx];
      ctx.save(); ctx.globalAlpha = 0.55;
      for (let k = 0; k < 3; k += 1) {
        const r = (18 + k * 9) * m;
        polygon(ctx, x + Math.sin(time * 0.4 + k + i) * 9, y + Math.cos(time * 0.33 + k) * 7, r, 6,
          time * (0.12 + k * 0.05) * (k % 2 ? -1 : 1), rgba(hue.rgb, 0.05), rgba(hue.rgb, 0.45), 1.6);
      }
      ctx.restore();
    }
  }

  function drawNull(n, time) {
    ctx.save();
    const r = n.radius;
    const g = radial(ctx, n.x, n.y, r * 1.9, 'rgba(5,6,14,0)', 'rgba(24,16,40,0.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r * 1.9, 0, TAU); ctx.fill();
    ctx.beginPath();
    const sides = 11;
    for (let i = 0; i < sides; i += 1) {
      const a = (i / sides) * TAU + n.wobble * 0.12;
      const wob = 1 + 0.16 * Math.sin(n.wobble * 2 + i * 1.7);
      const px = n.x + Math.cos(a) * r * wob;
      const py = n.y + Math.sin(a) * r * wob;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#0b0a16'; ctx.fill();
    ctx.strokeStyle = n.kind === 'chaser' ? 'rgba(255,90,120,0.55)' : 'rgba(150,110,220,0.5)';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(210,190,255,0.16)';
    ctx.beginPath(); ctx.arc(n.x - r * 0.25, n.y - r * 0.2, r * 0.22, 0, TAU); ctx.fill();
    if (n.kind === 'splitter') {
      ctx.strokeStyle = 'rgba(255,140,90,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(n.x - r * 0.5, n.y); ctx.lineTo(n.x + r * 0.5, n.y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawShard(s, time) {
    const hue = HUES[s.hue];
    const pulse = 0.85 + 0.15 * Math.sin(time * 4 + s.spin);
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.life - s.age < 2 ? (s.life - s.age) / 2 : 1);
    const g = radial(ctx, s.x, s.y, SHARD.radius * 3.2, rgba(hue.rgb, 0), rgba(hue.rgb, 0.35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, SHARD.radius * 3.2, 0, TAU); ctx.fill();
    polygon(ctx, s.x, s.y, SHARD.radius * pulse, 4, s.spin, hue.hex, '#ffffff', 1.4);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawPrism(state, time) {
    const p = state.player;
    const hue = HUES[Math.min(state.hueIndex, HUES.length - 1)];
    // Motion ribbon.
    ctx.save();
    const speed = Math.hypot(p.vx, p.vy);
    const len = Math.min(90, speed * 0.11);
    const tail = ctx.createLinearGradient(p.x - Math.cos(p.angle) * len, p.y - Math.sin(p.angle) * len, p.x, p.y);
    tail.addColorStop(0, rgba(hue.rgb, 0)); tail.addColorStop(1, rgba(hue.rgb, 0.5));
    ctx.strokeStyle = tail; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.angle) * len, p.y - Math.sin(p.angle) * len); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.restore();

    ctx.save();
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    const glow = radial(ctx, p.x, p.y, 72, rgba(hue.rgb, 0), rgba(hue.rgb, 0.45));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, 72, 0, TAU); ctx.fill();
    ctx.translate(p.x, p.y); ctx.rotate(p.angle + Math.PI / 2 + Math.sin(time * 2) * 0.05);
    // Three facets make a little prism, not a spaceship silhouette.
    polygon(ctx, 0, -22, 25, 3, 0, hue.hex, 'rgba(255,255,255,0.9)', 1.7);
    polygon(ctx, 0, -22, 14, 3, Math.PI, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -9, 4.5, 0, TAU); ctx.fill();
    ctx.restore();

    if (p.dashTime > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 30 + (PLAYER_DASH_T - p.dashTime) * 90, 0, TAU); ctx.stroke();
    }
  }
  const PLAYER_DASH_T = 0.15;

  function drawEffects(state) {
    for (const r of state.ripples) {
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, 0.5 * (1 - r.age / r.life));
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(state, time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.void; ctx.fillRect(0, 0, view.width, view.height);
    const shake = state.shake * 7;
    ctx.save();
    ctx.setTransform(view.scale, 0, 0, view.scale,
      view.x + (Math.random() - 0.5) * shake, view.y + (Math.random() - 0.5) * shake);
    ctx.beginPath(); ctx.rect(0, 0, FIELD.width, FIELD.height); ctx.clip();
    backdrop(state, time);
    flora(state, time);
    for (const n of state.nulls) drawNull(n, time);
    for (const s of state.shards) drawShard(s, time);
    drawEffects(state);
    if (state.screen !== 'title') drawPrism(state, time);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.18})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    // A thin frame makes the playfield read as a contained arena.
    ctx.strokeStyle = PALETTE.line; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, FIELD.width - 2, FIELD.height - 2);
    ctx.restore();
  }

  // HUD and menu panels are drawn in logical coordinates without screen shake.
  function overlay() {
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    return ctx;
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, overlay, view, resize };
}
