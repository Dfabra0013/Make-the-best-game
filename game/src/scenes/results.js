// The end of a run, win or lose: the score, the grade, the numbers behind it and
// every dusk the fox got through. Both endings land here, because a player who
// just lost needs the same thing as a player who just won, which is to know
// exactly how it went and how to start again.

import { ParticleField } from '../engine/particles.js';
import { Rng } from '../engine/rng.js';
import { TAU, drawText, easeOutCubic, formatNumber, glowBall, mixColor, rgba } from '../engine/draw.js';
import { FONT_DISPLAY, FONT_UI } from '../engine/draw.js';
import { DUSKS } from '../data/dusks.js';
import { STAGE } from '../render/layout.js';
import { drawMeadow, drawVignette } from '../render/meadow.js';
import { drawHorizonHaze, drawSky } from '../render/sky.js';
import { drawLabel, drawPanel, drawScreenShade } from '../render/ui.js';
import { fillRoundRect, strokeRoundRect } from '../engine/draw.js';

const DAWN = {
  ...DUSKS[0].sky,
  top: '#4b4472',
  mid: '#b98a9c',
  low: '#ffd7a6',
  sun: '#fff1cf',
  sunGlow: '#ffd9a0',
  cloud: '#ffe0bd',
  hillFar: '#6a5a78',
  hillMid: '#4c3f5c',
  pines: '#2a2036',
  groundTop: '#3b3152',
  groundLow: '#1b1628',
  grass: '#5b4d70',
  stone: '#453a58',
  fog: '#ffd0a8',
  text: '#fff6e8',
  dim: '#dcc7c2',
};

export class ResultsScene {
  enter(game, params = {}) {
    this.time = 0;
    this.victory = Boolean(params.victory);
    this.reason = params.reason ?? null;
    this.rng = new Rng(0x4e11);
    this.particles = new ParticleField(this.rng);
    this.palette = this.victory ? DAWN : DUSKS[Math.min(game.run.duskIndex, DUSKS.length - 1)].sky;
    this.revealed = 0;
    this.celebrated = false;
  }

  update(dt, game) {
    this.time += dt;
    this.revealed = Math.min(1, this.revealed + dt * 1.6);
    this.particles.update(dt);
    if (this.victory && this.time < 3 && this.rng.chance(0.6)) {
      this.particles.motes(this.rng.range(120, 1160), STAGE.height * 0.75, { count: 2, color: this.palette.sun, life: 2.6, rise: 70 });
    }
    if (!this.celebrated && this.victory && this.time > 0.4) {
      this.celebrated = true;
      for (let i = 0; i < 3; i += 1) {
        this.particles.ring(STAGE.width / 2, 220, { color: this.palette.sun, size: 60 + i * 40, grow: 240, life: 1.4, alpha: 0.35 });
      }
    }
    if (game.input.hit('KeyR', 'Enter', 'NumpadEnter', 'Space')) {
      game.playSound('click');
      game.beginRun();
    }
    if (game.input.hit('KeyT', 'Escape')) game.startTitle();
  }

  draw(ctx, game) {
    const run = game.run;
    drawSky(ctx, this.palette, this.time, this.victory ? 0 : run.duskIndex);
    drawMeadow(ctx, this.palette, this.time);
    drawHorizonHaze(ctx, this.palette, this.time);
    drawVignette(ctx, this.palette);
    drawScreenShade(ctx, this.palette, this.victory ? 0.42 : 0.62);
    this.particles.draw(ctx);

    if (this.victory) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glowBall(ctx, STAGE.width / 2, 210, 420, this.palette.sun, 0.16 + Math.sin(this.time) * 0.02, 0.02);
      ctx.restore();
    }

    const ease = easeOutCubic(this.revealed);
    drawText(ctx, this.victory ? 'Dawn' : 'The night came', STAGE.width / 2, 186 + (1 - ease) * 14, {
      font: `600 ${this.victory ? 92 : 74}px ${FONT_DISPLAY}`,
      fill: this.victory ? this.palette.text : mixColor(this.palette.houndEye, this.palette.text, 0.45),
      align: 'center',
      shadow: 26,
      shadowColor: rgba(this.palette.groundLow, 0.7),
    });

    drawText(
      ctx,
      this.victory ? 'every wisp is home and the meadow is gold again' : this.reason ?? 'the flock was still out when the light went',
      STAGE.width / 2,
      232,
      {
        font: `400 22px ${FONT_DISPLAY}`,
        fill: rgba(this.palette.dim, 0.95),
        align: 'center',
      },
    );

    this.drawGrade(ctx, run);
    this.drawScore(ctx, run);
    this.drawStats(ctx, run);
    this.drawDuskStrip(ctx, run);
    this.drawPrompt(ctx, game);
  }

  drawGrade(ctx, run) {
    const x = STAGE.width / 2;
    const y = 282;
    const label = this.victory ? run.grade : 'run ended';
    const width = 236;
    fillRoundRect(ctx, x - width / 2, y - 22, width, 40, 20, rgba(this.palette.accent, 0.14));
    strokeRoundRect(ctx, x - width / 2, y - 22, width, 40, 20, rgba(this.palette.accent, 0.5), 1.3);
    drawText(ctx, this.victory ? label : 'no grade', x, y + 2, {
      font: `700 13px ${FONT_UI}`,
      fill: rgba(this.palette.accent, 0.95),
      align: 'center',
      baseline: 'middle',
      letterSpacing: 3,
    });
  }

  drawScore(ctx, run) {
    const x = STAGE.width / 2 - 260;
    const y = 330;
    drawPanel(ctx, x, y, 520, 132, this.palette, { radius: 18, fill: 0.5 });
    drawLabel(ctx, 'final score', STAGE.width / 2, y + 34, this.palette, { align: 'center', alpha: 0.8 });
    drawText(ctx, formatNumber(run.score), STAGE.width / 2, y + 96, {
      font: `600 68px ${FONT_DISPLAY}`,
      fill: this.palette.text,
      align: 'center',
    });
  }

  drawStats(ctx, run) {
    const stats = [
      { label: 'wisps home', value: String(run.stats.delivered) },
      { label: 'dusks kept', value: `${run.duskRecords.length}/${DUSKS.length}` },
      { label: 'best streak', value: `x${run.stats.bestCombo}` },
      { label: 'flares lit', value: String(run.stats.flares) },
    ];
    const totalWidth = 980;
    const cell = totalWidth / stats.length;
    const x = STAGE.width / 2 - totalWidth / 2;
    const y = 492;
    stats.forEach((stat, index) => {
      const cx = x + index * cell;
      drawText(ctx, stat.value, cx + cell / 2, y + 24, {
        font: `600 38px ${FONT_DISPLAY}`,
        fill: this.palette.text,
        align: 'center',
      });
      drawLabel(ctx, stat.label, cx + cell / 2, y + 46, this.palette, { align: 'center', alpha: 0.65 });
      if (index > 0) {
        ctx.fillStyle = rgba(this.palette.text, 0.1);
        ctx.fillRect(cx - cell / 2, y - 6, 1, 46);
      }
    });
  }

  drawDuskStrip(ctx, run) {
    const count = DUSKS.length;
    const width = 186;
    const gap = 16;
    const total = width * count + gap * (count - 1);
    const startX = STAGE.width / 2 - total / 2;
    const y = 580;
    DUSKS.forEach((dusk, index) => {
      const record = run.duskRecords[index];
      const done = Boolean(record);
      const current = index === run.duskIndex && !done;
      const x = startX + index * (width + gap);
      fillRoundRect(ctx, x, y, width, 74, 14, rgba(this.palette.groundLow, done ? 0.55 : 0.35));
      strokeRoundRect(ctx, x, y, width, 74, 14, rgba(done ? this.palette.accent : this.palette.dim, done ? 0.55 : 0.2), 1.2);
      drawLabel(ctx, `dusk ${index + 1}`, x + 14, y + 22, this.palette, { alpha: 0.6 });
      drawText(ctx, dusk.name, x + 14, y + 46, {
        font: `600 19px ${FONT_DISPLAY}`,
        fill: rgba(this.palette.text, done ? 1 : 0.5),
      });
      if (done) {
        drawText(ctx, `${record.delivered}/${record.goal}`, x + width - 14, y + 46, {
          font: `600 20px ${FONT_DISPLAY}`,
          fill: this.palette.accent,
          align: 'right',
        });
        for (let i = 0; i < Math.min(record.delivered, 8); i += 1) {
          ctx.fillStyle = rgba(this.palette.wisp, 0.55);
          ctx.beginPath();
          ctx.arc(x + 16 + i * 9, y + 62, 2.4, 0, TAU);
          ctx.fill();
        }
      } else if (current) {
        drawLabel(ctx, 'unfinished', x + width - 14, y + 22, this.palette, { align: 'right', alpha: 0.6 });
        drawText(ctx, `${record?.delivered ?? 0}/${dusk.goal}`, x + width - 14, y + 46, {
          font: `600 20px ${FONT_DISPLAY}`,
          fill: rgba(this.palette.dim, 0.7),
          align: 'right',
        });
      }
    });
  }

  drawPrompt(ctx, game) {
    const pulse = 0.55 + Math.sin(this.time * 2.8) * 0.35;
    drawText(ctx, 'press R to run it back', STAGE.width / 2, 716, {
      font: `600 26px ${FONT_DISPLAY}`,
      fill: mixColor(this.palette.text, this.palette.sun, 0.3),
      align: 'center',
      alpha: pulse,
    });
    drawText(ctx, `best run ${formatNumber(Math.max(game.bestScore, game.run.score))} · T returns to the title`, STAGE.width / 2, 748, {
      font: `400 14px ${FONT_UI}`,
      fill: rgba(this.palette.dim, 0.6),
      align: 'center',
    });
  }
}
