// Title/loadout hall, relic draft, pause and expedition summary screens with hit-testable buttons.

import { ARENA_HEIGHT, ARENA_WIDTH, CHASSIS_LOADOUTS } from './config.js';
import { TWO_PI } from './mathutil.js';
import { drawGlassPanel, drawGlowText, roundedRectPath, strokeRing } from './render.js';
import { drawRelicIcon } from './hud.js';
import { applySelectedRelic, relicTierLabel } from './relics.js';
import { rankForScore } from './state.js';

const GOLD = '#f2c14e';
const CYAN = '#39e6ff';
const MAGENTA = '#ff6fd8';
const MINT = '#7cffb2';
const FONT = '400 12px "DejaVu Sans", "Segoe UI", Arial, sans-serif';

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function registerButton(state, id, x, y, w, h, label) {
  state.uiButtons.push({ id, x, y, w, h, label });
}

function drawActionButton(ctx, state, spec) {
  const { id, x, y, w, h } = spec;
  const hovered = state.hoveredButtonId === id;
  const accent = spec.accent ?? GOLD;
  const radius = spec.radius ?? 12;
  ctx.save();
  if (hovered) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(1.02, 1.02);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  drawGlassPanel(ctx, x, y, w, h, {
    radius,
    accent: hovered || spec.filled ? accent : 'rgba(140, 186, 255, 0.22)',
    border: hovered ? accent : 'rgba(140, 186, 255, 0.3)',
    borderWidth: hovered ? 2 : 1.4,
    top: spec.filled ? 'rgba(52, 40, 16, 0.95)' : 'rgba(18, 28, 54, 0.94)',
    bottom: spec.filled ? 'rgba(28, 20, 8, 0.96)' : 'rgba(7, 12, 26, 0.96)',
  });
  drawGlowText(ctx, spec.label, x + w / 2, y + h / 2 + (spec.sublabel ? -2 : 6), {
    size: spec.size ?? 18,
    align: 'center',
    color: hovered ? '#fffdf4' : spec.color ?? '#e9f1ff',
    glow: hovered ? accent : undefined,
    blur: 14,
    letterSpacing: spec.letterSpacing ?? 2.4,
  });
  if (spec.sublabel) {
    drawGlowText(ctx, spec.sublabel, x + w / 2, y + h / 2 + 17, {
      size: 9.5,
      align: 'center',
      color: 'rgba(196, 214, 244, 0.66)',
      letterSpacing: 1.6,
    });
  }
  ctx.restore();
  registerButton(state, id, x, y, w, h, spec.label);
}

function drawChassisCard(ctx, state, chassis, index, x, y, w, h) {
  const id = `chassis-${index}`;
  const selected = state.selectedChassisIndex === index;
  const hovered = state.hoveredButtonId === id;
  registerButton(state, id, x, y, w, h, chassis.name);

  const scale = selected ? 1.03 : hovered ? 1.015 : 1;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  drawGlassPanel(ctx, x, y, w, h, {
    radius: 16,
    accent: selected ? chassis.primaryColor : undefined,
    border: selected ? chassis.primaryColor : hovered ? 'rgba(190, 220, 255, 0.6)' : 'rgba(130, 170, 230, 0.22)',
    borderWidth: selected ? 2.4 : 1.3,
    top: selected ? 'rgba(26, 38, 68, 0.97)' : 'rgba(15, 23, 44, 0.92)',
    bottom: 'rgba(6, 10, 22, 0.96)',
  });
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const sheen = ctx.createRadialGradient(x + w / 2, y + 18, 4, x + w / 2, y + 18, 160);
  sheen.addColorStop(0, `${chassis.primaryColor}33`);
  sheen.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  drawGlowText(ctx, chassis.name, x + 20, y + 34, {
    size: 17,
    color: selected ? '#ffffff' : '#e4edff',
    glow: selected ? chassis.primaryColor : undefined,
    blur: 12,
    letterSpacing: 1.6,
  });
  drawGlowText(ctx, chassis.role.toUpperCase(), x + 20, y + 52, {
    size: 9.5,
    color: chassis.accentColor,
    letterSpacing: 2.2,
  });

  ctx.font = FONT;
  wrapText(ctx, chassis.tagline, w - 40).slice(0, 3).forEach((line, i) => {
    drawGlowText(ctx, line, x + 20, y + 80 + i * 17, {
      size: 11.5,
      weight: 400,
      color: 'rgba(198, 214, 240, 0.78)',
    });
  });

  [
    ['FIREPOWER', chassis.stats.firepower],
    ['AGILITY', chassis.stats.agility],
    ['ECHO SYNC', chassis.stats.echoSync],
  ].forEach(([label, value], i) => {
    drawGlowText(ctx, label, x + 20, y + 146 + i * 22, {
      size: 9,
      color: 'rgba(186, 206, 236, 0.7)',
      letterSpacing: 1.6,
    });
    for (let pip = 0; pip < 5; pip++) {
      roundedRectPath(ctx, x + w - 130 + pip * 22, y + 140 + i * 22, 16, 7, 3.5);
      ctx.fillStyle = pip < value ? (selected ? chassis.primaryColor : '#7fa6d8') : 'rgba(120, 150, 200, 0.22)';
      ctx.fill();
    }
  });

  if (selected) {
    drawGlowText(ctx, 'SELECTED', x + w - 20, y + 26, {
      size: 8.5,
      align: 'right',
      color: chassis.primaryColor,
      letterSpacing: 2,
    });
  }
  ctx.restore();
}

export function renderTitleAndLoadoutScreen(ctx, state, time) {
  const shade = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
  shade.addColorStop(0, 'rgba(3, 6, 14, 0.7)');
  shade.addColorStop(0.42, 'rgba(4, 8, 18, 0.16)');
  shade.addColorStop(0.72, 'rgba(3, 6, 14, 0.55)');
  shade.addColorStop(1, 'rgba(3, 6, 14, 0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  drawGlowText(ctx, 'AN ORIGINAL TIME-BENDING ARENA SHOOTER', 40, 42, {
    size: 9.5,
    color: 'rgba(178, 200, 232, 0.62)',
    letterSpacing: 3.4,
  });
  drawGlowText(ctx, `BEST ${state.bestScore.toLocaleString('en-US')}`, ARENA_WIDTH - 40, 42, {
    size: 10,
    align: 'right',
    color: GOLD,
    letterSpacing: 2,
  });

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 1.2);
  const titleAura = ctx.createRadialGradient(ARENA_WIDTH / 2, 128, 20, ARENA_WIDTH / 2, 128, 420);
  titleAura.addColorStop(0, 'rgba(255, 198, 92, 0.22)');
  titleAura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = titleAura;
  ctx.fillRect(0, 0, ARENA_WIDTH, 320);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.72 + 0.28 * Math.sin(time * 1.6);
  drawGlowText(ctx, 'CHRONODIAL', ARENA_WIDTH / 2, 148, {
    size: 86,
    align: 'center',
    color: '#fff8e6',
    glow: GOLD,
    blur: 34,
    letterSpacing: 12,
    stroke: 'rgba(120, 68, 10, 0.55)',
    strokeWidth: 5,
  });
  ctx.restore();
  drawGlowText(ctx, 'S H A T T E R E D   O R B I T', ARENA_WIDTH / 2, 190, {
    size: 22,
    align: 'center',
    color: CYAN,
    glow: 'rgba(57, 230, 255, 0.8)',
    blur: 22,
    letterSpacing: 6,
  });
  drawGlowText(ctx, 'Rewind your own flight. Every burn you make becomes a second gunner.', ARENA_WIDTH / 2, 222, {
    size: 13,
    align: 'center',
    weight: 400,
    color: 'rgba(208, 222, 245, 0.82)',
  });

  const cardWidth = 302;
  const gap = 30;
  const startX = (ARENA_WIDTH - (cardWidth * 3 + gap * 2)) / 2;
  CHASSIS_LOADOUTS.forEach((chassis, index) =>
    drawChassisCard(ctx, state, chassis, index, startX + index * (cardWidth + gap), 246, cardWidth, 210),
  );

  drawGlassPanel(ctx, startX, 472, cardWidth * 3 + gap * 2, 86, {
    radius: 14,
    border: 'rgba(140, 186, 255, 0.2)',
    top: 'rgba(12, 20, 38, 0.86)',
    bottom: 'rgba(5, 9, 20, 0.9)',
  });
  drawGlowText(ctx, 'HOW TO WIN', startX + 22, 498, { size: 11, color: GOLD, letterSpacing: 2.4 });
  drawGlowText(ctx, 'Clear 9 waves across three Astral Realms, then break each Act Boss to reach the Eclipse Throne.', startX + 22, 520, {
    size: 12,
    weight: 400,
    color: 'rgba(208, 222, 245, 0.85)',
  });
  drawGlowText(ctx, 'Astrolabe Prisms refract your bolts. Q summons a Time-Echo that replays your last 5 seconds and fires too.', startX + 22, 542, {
    size: 12,
    weight: 400,
    color: 'rgba(208, 222, 245, 0.85)',
  });

  drawActionButton(ctx, state, {
    id: 'start',
    x: (ARENA_WIDTH - 448) / 2,
    y: 578,
    w: 448,
    h: 62,
    label: 'START EXPEDITION',
    sublabel: 'CLICK OR PRESS ENTER',
    accent: GOLD,
    filled: true,
    color: '#fff5d8',
    size: 21,
    letterSpacing: 4,
  });

  drawGlowText(ctx, 'WASD / ARROWS MOVE   MOUSE AIM   HOLD CLICK FIRE   SPACE DASH   Q TIME-ECHO   F OVERDRIVE   ESC PAUSE', ARENA_WIDTH / 2, 686, {
    size: 10.5,
    align: 'center',
    color: 'rgba(178, 200, 232, 0.62)',
    letterSpacing: 1.4,
  });
  drawGlowText(ctx, '9 WAVES   3 ACT BOSSES   18 CHRONO-RELICS   6 HOSTILE TYPES   ENDLESS ORBIT', ARENA_WIDTH / 2, 714, {
    size: 9.5,
    align: 'center',
    color: 'rgba(140, 166, 204, 0.5)',
    letterSpacing: 2.6,
  });
  drawGlowText(ctx, 'ORIGINAL GAME · NO EXTERNAL ASSETS · RUNS OFFLINE', ARENA_WIDTH / 2, 762, {
    size: 9,
    align: 'center',
    color: 'rgba(120, 146, 184, 0.42)',
    letterSpacing: 2,
  });
}

export function renderRelicDraftOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(3, 6, 14, 0.82)';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  drawGlowText(ctx, `WAVE ${state.wave} CLEARED`, ARENA_WIDTH / 2, 100, {
    size: 12,
    align: 'center',
    color: MINT,
    letterSpacing: 5,
    glow: 'rgba(124, 255, 178, 0.7)',
  });
  drawGlowText(ctx, 'FORGE A CHRONO-RELIC', ARENA_WIDTH / 2, 150, {
    size: 38,
    align: 'center',
    color: '#fff8e6',
    glow: GOLD,
    blur: 26,
    letterSpacing: 6,
  });
  drawGlowText(ctx, 'Relics stack for the whole expedition. Click a card, or press 1 / 2 / 3.', ARENA_WIDTH / 2, 178, {
    size: 12,
    align: 'center',
    weight: 400,
    color: 'rgba(206, 222, 246, 0.8)',
  });

  const cardWidth = 312;
  const cardHeight = 336;
  const gap = 34;
  const startX = (ARENA_WIDTH - (cardWidth * 3 + gap * 2)) / 2;
  const top = 210;

  state.relicDraftChoices.forEach((relic, index) => {
    const x = startX + index * (cardWidth + gap);
    const id = `relic-${relic.id}`;
    const hovered = state.hoveredButtonId === id;
    const tierColor = relic.tier === 3 ? GOLD : relic.tier === 2 ? '#c79bff' : CYAN;
    registerButton(state, id, x, top, cardWidth, cardHeight, relic.name);

    ctx.save();
    if (hovered) {
      ctx.translate(x + cardWidth / 2, top + cardHeight / 2);
      ctx.scale(1.03, 1.03);
      ctx.translate(-(x + cardWidth / 2), -(top + cardHeight / 2));
    }
    drawGlassPanel(ctx, x, top, cardWidth, cardHeight, {
      radius: 16,
      accent: hovered ? tierColor : undefined,
      border: hovered ? tierColor : 'rgba(140, 186, 255, 0.28)',
      borderWidth: hovered ? 2.4 : 1.4,
      top: 'rgba(20, 30, 56, 0.96)',
      bottom: 'rgba(6, 10, 22, 0.97)',
    });
    drawGlowText(ctx, relicTierLabel(relic.tier), x + 20, top + 28, {
      size: 9,
      color: tierColor,
      letterSpacing: 2.6,
    });
    drawGlowText(ctx, `0${index + 1}`, x + cardWidth - 20, top + 28, {
      size: 10,
      align: 'right',
      color: 'rgba(170, 194, 228, 0.5)',
      letterSpacing: 1.4,
    });

    ctx.save();
    ctx.translate(x + cardWidth / 2, top + 82);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const angle = (k / 6) * TWO_PI + Math.PI / 6;
      const px = Math.cos(angle) * 40;
      const py = Math.sin(angle) * 40;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 18, 34, 0.92)';
    ctx.fill();
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawRelicIcon(ctx, relic.icon, 0, 0, 34, tierColor);
    ctx.restore();

    drawGlowText(ctx, relic.name, x + cardWidth / 2, top + 156, {
      size: 18,
      align: 'center',
      color: '#ffffff',
      glow: tierColor,
      blur: 10,
    });

    ctx.font = FONT;
    wrapText(ctx, relic.blurb, cardWidth - 52).slice(0, 4).forEach((line, i) => {
      drawGlowText(ctx, line, x + cardWidth / 2, top + 188 + i * 19, {
        size: 12,
        weight: 400,
        align: 'center',
        color: 'rgba(202, 218, 242, 0.82)',
      });
    });

    drawGlowText(ctx, `${Object.keys(relic.effects).length} STACKING EFFECT(S)`, x + cardWidth / 2, top + cardHeight - 42, {
      size: 9,
      align: 'center',
      color: 'rgba(170, 194, 228, 0.55)',
      letterSpacing: 2,
    });
    drawGlowText(ctx, hovered ? 'FORGE THIS RELIC' : 'CLICK TO SELECT', x + cardWidth / 2, top + cardHeight - 20, {
      size: 10,
      align: 'center',
      color: hovered ? tierColor : 'rgba(150, 176, 212, 0.5)',
      letterSpacing: 2,
    });
    ctx.restore();
  });

  if (state.relicDraftChoices.length === 0) {
    drawGlowText(ctx, 'All relics forged - continue to the next wave', ARENA_WIDTH / 2, 380, {
      size: 16,
      align: 'center',
      color: GOLD,
    });
    drawActionButton(ctx, state, {
      id: 'draft-continue',
      x: (ARENA_WIDTH - 320) / 2,
      y: 424,
      w: 320,
      h: 58,
      label: 'NEXT WAVE',
      accent: GOLD,
      filled: true,
    });
  }

  drawGlowText(ctx, `RELICS FORGED ${state.relics.length}`, 40, ARENA_HEIGHT - 34, {
    size: 10,
    color: 'rgba(178, 200, 232, 0.6)',
    letterSpacing: 2,
  });
}

export function renderPauseOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(3, 6, 14, 0.78)';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  const width = 460;
  const height = 340;
  const x = (ARENA_WIDTH - width) / 2;
  const y = 220;
  drawGlassPanel(ctx, x, y, width, height, {
    radius: 18,
    accent: CYAN,
    border: 'rgba(140, 186, 255, 0.34)',
    top: 'rgba(18, 30, 58, 0.97)',
    bottom: 'rgba(6, 10, 22, 0.98)',
  });
  drawGlowText(ctx, 'PAUSED', ARENA_WIDTH / 2, y + 58, {
    size: 34,
    align: 'center',
    color: '#f2f7ff',
    glow: CYAN,
    blur: 20,
    letterSpacing: 8,
  });
  drawGlowText(ctx, `${state.realm.name} · WAVE ${state.wave} · SCORE ${state.score.toLocaleString('en-US')}`, ARENA_WIDTH / 2, y + 82, {
    size: 11,
    align: 'center',
    color: 'rgba(198, 216, 244, 0.7)',
    letterSpacing: 1.6,
  });

  drawActionButton(ctx, state, { id: 'resume', x: x + 60, y: y + 108, w: width - 120, h: 54, label: 'RESUME EXPEDITION', accent: CYAN, filled: true, size: 16 });
  drawActionButton(ctx, state, { id: 'restart', x: x + 60, y: y + 172, w: width - 120, h: 46, label: 'RESTART RUN', accent: GOLD, size: 13 });
  drawActionButton(ctx, state, { id: 'to-title', x: x + 60, y: y + 226, w: width - 120, h: 46, label: 'CHANGE CHASSIS', accent: MAGENTA, size: 13 });
  drawGlowText(ctx, 'ESC RESUME · M TOGGLE MUSIC', ARENA_WIDTH / 2, y + 306, {
    size: 9.5,
    align: 'center',
    color: 'rgba(160, 184, 216, 0.55)',
    letterSpacing: 1.8,
  });
}

function drawMetric(ctx, x, y, label, value, color) {
  drawGlowText(ctx, label, x, y, { size: 8.5, color: 'rgba(170, 194, 228, 0.6)', letterSpacing: 1.8 });
  drawGlowText(ctx, value, x, y + 22, { size: 17, color: color ?? '#eef4ff' });
}

export function renderRunSummaryScreen(ctx, state, time) {
  const victory = state.mode === 'victory';
  const rank = rankForScore(state);
  const accent = victory ? GOLD : '#ff6b7d';
  const minutes = Math.floor(state.runTimeSec / 60);
  const seconds = Math.floor(state.runTimeSec % 60);

  const shade = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
  shade.addColorStop(0, 'rgba(3, 6, 14, 0.975)');
  shade.addColorStop(0.5, 'rgba(4, 8, 18, 0.955)');
  shade.addColorStop(1, 'rgba(3, 6, 14, 0.985)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  drawGlowText(ctx, victory ? 'EXPEDITION COMPLETE' : 'ORBIT SHATTERED', ARENA_WIDTH / 2, 82, {
    size: 40,
    align: 'center',
    color: victory ? '#fff8e6' : '#ffd7dc',
    glow: accent,
    blur: 28,
    letterSpacing: 7,
  });
  drawGlowText(ctx, victory ? 'The Eclipse Throne is silent. The Chronodial turns again.' : 'Your hull gave out. The dial remembers every attempt.', ARENA_WIDTH / 2, 110, {
    size: 12.5,
    align: 'center',
    weight: 400,
    color: 'rgba(204, 220, 244, 0.8)',
  });

  const ringX = 292;
  const ringY = 288;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(ringX, ringY, 20, ringX, ringY, 150);
  aura.addColorStop(0, victory ? 'rgba(242, 193, 78, 0.28)' : 'rgba(255, 107, 125, 0.24)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(ringX - 160, ringY - 160, 320, 320);
  ctx.restore();

  ctx.save();
  ctx.translate(ringX, ringY);
  strokeRing(ctx, 108, `${accent}88`, 2, 1, [10, 16], -time * 0.25);
  strokeRing(ctx, 92, accent, 3);
  ctx.restore();

  drawGlowText(ctx, rank.letter, ringX, ringY + 30, {
    size: 84,
    align: 'center',
    color: '#fffdf4',
    glow: accent,
    blur: 26,
  });
  drawGlowText(ctx, rank.label.toUpperCase(), ringX, ringY + 136, {
    size: 10,
    align: 'center',
    color: accent,
    letterSpacing: 2.4,
  });
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(ringX - 40 + i * 20, ringY + 156, 4.6, 0, TWO_PI);
    ctx.fillStyle = i < rank.stars ? accent : 'rgba(140, 160, 190, 0.3)';
    ctx.fill();
  }

  const panelX = 470;
  const panelWidth = 700;
  drawGlassPanel(ctx, panelX, 168, panelWidth, 200, {
    radius: 18,
    accent,
    border: 'rgba(140, 186, 255, 0.24)',
    top: 'rgba(16, 26, 50, 0.94)',
    bottom: 'rgba(5, 9, 20, 0.97)',
  });
  drawGlowText(ctx, victory ? 'FINAL SCORE' : 'SCORE', panelX + 32, 208, {
    size: 10,
    color: 'rgba(186, 206, 236, 0.7)',
    letterSpacing: 3,
  });
  drawGlowText(ctx, state.score.toLocaleString('en-US'), panelX + 32, 264, {
    size: 54,
    color: '#fffdf4',
    glow: accent,
    blur: 22,
  });

  const rightX = panelX + panelWidth - 32;
  drawGlowText(ctx, `BEST ${state.bestScore.toLocaleString('en-US')}`, rightX, 220, { size: 13, align: 'right', color: GOLD, letterSpacing: 2 });
  drawGlowText(ctx, `TIME ${minutes}:${String(seconds).padStart(2, '0')}`, rightX, 252, { size: 13, align: 'right', color: 'rgba(210, 226, 248, 0.8)', letterSpacing: 2 });
  drawGlowText(ctx, `WAVE ${state.wave} · ${state.endlessMode ? 'ENDLESS' : 'CAMPAIGN'}`, rightX, 284, { size: 13, align: 'right', color: 'rgba(210, 226, 248, 0.8)', letterSpacing: 2 });
  drawGlowText(ctx, `PEAK COMBO x${state.peakCombo.toFixed(2)}`, rightX, 316, { size: 13, align: 'right', color: CYAN, letterSpacing: 2 });

  drawGlowText(ctx, 'TELEMETRY', panelX, 398, { size: 9, color: 'rgba(170, 194, 228, 0.58)', letterSpacing: 3 });
  const accuracy = state.stats.shotsFired > 0 ? `${Math.round((state.stats.shotsLanded / state.stats.shotsFired) * 100)}%` : '0%';
  const stats = [
    ['HOSTILES DOWN', String(state.stats.enemiesDefeated)],
    ['ECHOES SUMMONED', String(state.stats.echoesSummoned)],
    ['CROSSFIRE HITS', String(state.stats.crossfireStrikes)],
    ['PRISM REFRACTIONS', String(state.stats.prismRicochets)],
    ['SHARDS COLLECTED', String(state.stats.shardsCollected)],
    ['BOSSES BROKEN', String(state.stats.bossesDefeated)],
    ['SHOTS FIRED', String(state.stats.shotsFired)],
    ['ACCURACY', accuracy],
  ];
  const statColors = [undefined, undefined, CYAN, '#c79bff'];
  stats.forEach(([label, value], index) => {
    drawMetric(ctx, panelX + 2 + (index % 4) * 176, 418 + Math.floor(index / 4) * 52, label, value, statColors[index % 4]);
  });

  drawGlowText(ctx, 'CHRONO-RELICS FORGED', panelX, 530, { size: 9, color: 'rgba(170, 194, 228, 0.58)', letterSpacing: 3 });
  if (state.relics.length === 0) {
    drawGlowText(ctx, 'None - the dial turned against you.', panelX + 2, 554, {
      size: 11,
      weight: 400,
      color: 'rgba(178, 196, 224, 0.6)',
    });
  }
  state.relics.slice(0, 9).forEach((relic, index) => {
    const tierColor = relic.tier === 3 ? GOLD : relic.tier === 2 ? '#c79bff' : CYAN;
    ctx.save();
    ctx.translate(panelX + 20 + index * 74, 562);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const angle = (k / 6) * TWO_PI + Math.PI / 6;
      const px = Math.cos(angle) * 18;
      const py = Math.sin(angle) * 18;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 18, 34, 0.9)';
    ctx.fill();
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawRelicIcon(ctx, relic.icon, 0, 0, 17, tierColor);
    ctx.restore();
  });

  drawActionButton(ctx, state, {
    id: 'play-again',
    x: 252,
    y: 640,
    w: 250,
    h: 62,
    label: 'PLAY AGAIN',
    sublabel: 'KEEP THIS CHASSIS',
    accent: GOLD,
    filled: true,
    size: 17,
  });
  drawActionButton(ctx, state, {
    id: 'change-chassis',
    x: 518,
    y: 640,
    w: 250,
    h: 62,
    label: 'CHANGE CHASSIS',
    sublabel: 'BACK TO LOADOUT',
    accent: CYAN,
    size: 15,
  });
  drawActionButton(ctx, state, {
    id: victory ? 'endless' : 'to-title',
    x: 784,
    y: 640,
    w: 250,
    h: 62,
    label: victory ? 'ENDLESS ORBIT' : 'TITLE SCREEN',
    sublabel: victory ? 'ESCALATING WAVES' : 'CHANGE CHASSIS',
    accent: MAGENTA,
    size: 15,
  });

  drawGlowText(ctx, 'ENTER PLAY AGAIN · ESC TITLE', ARENA_WIDTH / 2, 734, {
    size: 9.5,
    align: 'center',
    color: 'rgba(160, 184, 216, 0.55)',
    letterSpacing: 2,
  });
}

const BUTTON_ACTIONS = {
  start: 'start-run',
  'play-again': 'start-run',
  restart: 'restart-run',
  'to-title': 'to-title',
  'change-chassis': 'to-title',
  endless: 'endless',
  'draft-continue': 'next-wave',
};

export function handleUiAction(state, buttonId) {
  if (buttonId === 'resume') {
    state.mode = 'playing';
    return true;
  }
  if (buttonId.startsWith('chassis-')) {
    const index = Number(buttonId.split('-')[1]);
    if (!Number.isInteger(index) || index < 0 || index >= CHASSIS_LOADOUTS.length) return false;
    state.selectedChassisIndex = index;
    return true;
  }
  if (buttonId.startsWith('relic-')) {
    if (!applySelectedRelic(state, buttonId.slice('relic-'.length))) return false;
    state.pendingAction = 'next-wave';
    return true;
  }
  if (buttonId === 'resume') {
    state.mode = 'playing';
    return true;
  }
  const action = BUTTON_ACTIONS[buttonId];
  if (!action) return false;
  state.pendingAction = action;
  return true;
}

export function resolveKeyboardUi(state, key) {
  if (state.mode === 'title' && key === 'enter') return 'start';
  if (state.mode === 'relic-draft') {
    const index = Number(key) - 1;
    if (Number.isInteger(index) && index >= 0 && index < state.relicDraftChoices.length) {
      return `relic-${state.relicDraftChoices[index].id}`;
    }
    if (state.relicDraftChoices.length === 0 && key === 'enter') return 'draft-continue';
  }
  if (state.mode === 'victory' || state.mode === 'gameover') {
    if (key === 'enter') return 'play-again';
    if (key === 'escape') return 'to-title';
  }
  return null;
}
