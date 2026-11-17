// The moment between dusks: three charms are dealt and the fox takes one. The
// cards are the whole upgrade system, so they are allowed to take their time and
// be looked at, and the meadow keeps breathing behind them.

import { ParticleField } from '../engine/particles.js';
import { Rng } from '../engine/rng.js';
import { clamp, drawText, easeOutBack, formatNumber, rgba } from '../engine/draw.js';
import { FONT_DISPLAY, FONT_UI } from '../engine/draw.js';
import { dealCharms } from '../data/charms.js';
import { drawHollow } from '../render/actors.js';
import { STAGE } from '../render/layout.js';
import { drawMeadow, drawVignette } from '../render/meadow.js';
import { drawHorizonHaze, drawSky } from '../render/sky.js';
import { drawCharmCard, drawLabel, drawPanel, drawScreenShade } from '../render/ui.js';

const CARD = { width: 300, height: 300, gap: 46 };

export class CharmScene {
  enter(game) {
    this.time = 0;
    this.rng = new Rng(0x51ce ^ (game.run.duskIndex * 131));
    this.particles = new ParticleField(this.rng);
    this.palette = game.run.dusk.sky;
    this.cards = dealCharms(this.rng, game.run.charms, 3);
    this.hovered = -1;
    this.chosen = -1;
    this.chosenT = 0;
    this.revealed = 0;
    this.hollow = { x: 1046, y: 462, radius: 104, pulse: 0, update() {}, runePosition: (i, n) => ({ x: 1046 + Math.cos(i / n * 6.28) * 74, y: 428 + Math.sin(i / n * 6.28) * 24 }) };
  }

  update(dt, game) {
    this.time += dt;
    this.revealed = Math.min(1, this.revealed + dt * 2.2);
    this.particles.update(dt);

    const cards = this.cardRects();
    const pointer = game.input.pointer;
    this.hovered = cards.findIndex((rect) => pointer.x > rect.x && pointer.x < rect.x + rect.w && pointer.y > rect.y + rect.lift && pointer.y < rect.y + rect.lift + rect.h);

    if (this.chosen >= 0) {
      this.chosenT += dt;
      if (this.chosenT > 0.36) {
        game.run.takeCharm(this.cards[this.chosen]);
        game.playSound('charm');
        game.startDusk(game.run.duskIndex + 1);
      }
      return;
    }

    const digit = game.input.digit();
    if (digit !== null && digit <= this.cards.length) this.pick(game, digit - 1);
    else if (game.input.hit('Mouse0') && this.hovered >= 0) this.pick(game, this.hovered);
    if (this.rng.chance(0.5)) this.particles.motes(STAGE.width * this.rng.next(), STAGE.height * 0.6, { count: 1, color: this.palette.accent, life: 2 });
  }

  pick(game, index) {
    this.chosen = index;
    this.chosenT = 0;
    this.particles.burst(this.cardRects()[index].x + CARD.width / 2, this.cardRects()[index].y + 70, {
      count: 24,
      color: this.palette.accent,
      speed: 260,
      size: 2.6,
    });
    game.playSound('click');
  }

  cardRects() {
    const total = CARD.width * 3 + CARD.gap * 2;
    const startX = STAGE.width / 2 - total / 2;
    const y = 336;
    return this.cards.map((_, index) => ({
      x: startX + index * (CARD.width + CARD.gap),
      y,
      w: CARD.width,
      h: CARD.height,
      lift: 0,
    }));
  }

  draw(ctx, game) {
    drawSky(ctx, this.palette, this.time, game.run.duskIndex);
    drawMeadow(ctx, this.palette, this.time);
    drawHollow(ctx, this.hollow, this.palette, this.time);
    drawHorizonHaze(ctx, this.palette, this.time);
    drawVignette(ctx, this.palette);
    drawScreenShade(ctx, this.palette, 0.62);
    this.particles.draw(ctx);

    drawText(ctx, 'the dusk is home', STAGE.width / 2, 132, {
      font: `400 22px ${FONT_DISPLAY}`,
      fill: rgba(this.palette.dim, 0.9),
      align: 'center',
    });
    drawText(ctx, 'Take a charm', STAGE.width / 2, 196, {
      font: `600 58px ${FONT_DISPLAY}`,
      fill: this.palette.text,
      align: 'center',
      shadow: 22,
      shadowColor: rgba(this.palette.groundLow, 0.7),
    });
    drawLabel(ctx, `dusk ${game.run.duskIndex + 2} of ${game.duskTotal} · choose one`, STAGE.width / 2, 232, this.palette, {
      align: 'center',
      alpha: 0.75,
    });

    const rects = this.cardRects();
    this.cards.forEach((charm, index) => {
      const appear = clamp((this.revealed - index * 0.12) / 0.6, 0, 1);
      const rect = rects[index];
      const chosenLift = this.chosen === index ? -14 : 0;
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.translate(0, (1 - easeOutBack(appear)) * 40 + chosenLift);
      drawCharmCard(ctx, charm, rect.x, rect.y, rect.w, rect.h, this.palette, {
        hovered: this.hovered === index,
        time: this.time,
        index,
        picked: this.chosen === index,
      });
      ctx.restore();
    });

    this.drawTakenRow(ctx, game);

    drawText(ctx, 'click a card, or press 1 2 3', STAGE.width / 2, 690, {
      font: `400 16px ${FONT_UI}`,
      fill: rgba(this.palette.dim, 0.7),
      align: 'center',
      letterSpacing: 0.6,
    });
  }

  drawTakenRow(ctx, game) {
    const taken = game.run.charms;
    if (taken.length === 0) return;
    drawLabel(ctx, 'charms taken', 60, 690, this.palette, { alpha: 0.6 });
    taken.forEach((id, index) => {
      const x = 60 + index * 148;
      drawPanel(ctx, x, 700, 138, 36, this.palette, { radius: 10, fill: 0.4 });
      drawText(ctx, id.replace(/-/g, ' '), x + 12, 723, {
        font: `600 15px ${FONT_DISPLAY}`,
        fill: rgba(this.palette.text, 0.9),
      });
    });
    drawText(ctx, formatNumber(game.run.score), STAGE.width - 60, 723, {
      font: `600 22px ${FONT_DISPLAY}`,
      fill: this.palette.accent,
      align: 'right',
    });
  }
}
