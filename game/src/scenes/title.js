// The title: the meadow at the first dusk, a fox with a lantern, wisps drifting
// where they like, and the name of the game. It is also the controls screen, since
// a player who reads nothing else should still know how to move, dash and flare.

import { FoxPlayer } from '../actors/fox.js';
import { Wisp } from '../actors/wisp.js';
import { ParticleField } from '../engine/particles.js';
import { Rng } from '../engine/rng.js';
import { clamp, drawText, formatNumber, mixColor, rgba } from '../engine/draw.js';
import { FONT_DISPLAY, FONT_UI } from '../engine/draw.js';
import { HollowGate } from '../systems/hollow.js';
import { DUSKS } from '../data/dusks.js';
import { BASE_TUNING } from '../run.js';
import { drawFox, drawHollow, drawWisp, drawLanternLight } from '../render/actors.js';
import { STAGE } from '../render/layout.js';
import { drawMeadow, drawVignette } from '../render/meadow.js';
import { drawHorizonHaze, drawSky } from '../render/sky.js';
import { drawKeycap, drawLabel, drawScreenShade, drawTitleLockup } from '../render/ui.js';

export class TitleScene {
  enter(game) {
    this.time = 0;
    this.rng = new Rng(0x7a1e);
    this.palette = DUSKS[0].sky;
    this.particles = new ParticleField(this.rng);
    this.hollow = new HollowGate(1046, 462, 104);
    this.fox = new FoxPlayer(268, 620, BASE_TUNING);
    this.wisps = [];
    for (let i = 0; i < 9; i += 1) {
      const wisp = new Wisp(this.rng.range(300, 1120), this.rng.range(380, 660), i % 4 === 0 ? 'mote' : 'wisp', this.rng);
      wisp.driftPhase = this.rng.range(0, 6.28);
      wisp.driftRadius = this.rng.range(30, 130);
      wisp.homeX = wisp.x;
      wisp.homeY = wisp.y;
      this.wisps.push(wisp);
    }
    this.prompt = 0;
    this.hovered = false;
    this.starting = 0;
  }

  update(dt, game) {
    this.time += dt;
    this.prompt += dt;
    this.particles.update(dt);
    this.fox.stepPhase += dt * 1.6;
    this.fox.bob = Math.sin(this.fox.stepPhase) * 1.1;
    this.hollow.update(dt);

    for (const wisp of this.wisps) {
      const t = this.time;
      wisp.x = wisp.homeX + Math.sin(t * 0.42 + wisp.driftPhase) * wisp.driftRadius;
      wisp.y = wisp.homeY + Math.cos(t * 0.31 + wisp.driftPhase * 1.4) * wisp.driftRadius * 0.5;
      wisp.vx = Math.cos(t * 0.42 + wisp.driftPhase) * 30;
      wisp.vy = Math.sin(t * 0.31 + wisp.driftPhase * 1.4) * 16;
      wisp.bob += dt * 2.4;
      wisp.phase += dt;
      if (this.rng.chance(0.02)) {
        this.particles.motes(wisp.x, wisp.y, { count: 1, color: this.palette.wisp, life: 1.1 });
      }
    }
    if (this.rng.chance(0.3)) {
      this.particles.motes(this.hollow.x, this.hollow.y - 10, { count: 1, color: this.palette.hollow, life: 1.6 });
    }

    this.hovered = game.input.pointer.inside && game.input.pointer.y > 560;
    if (this.starting > 0) {
      this.starting += dt;
      if (this.starting > 0.55) game.beginRun();
      return;
    }
    if (game.input.hit('Enter', 'Space', 'NumpadEnter') || (game.input.hit('Mouse0') && this.hovered)) {
      this.starting = 0.0001;
      game.playSound('click');
    }
  }

  draw(ctx, game) {
    drawSky(ctx, this.palette, this.time, 0);
    drawMeadow(ctx, this.palette, this.time);
    drawHollow(ctx, this.hollow, this.palette, this.time);

    const light = {
      origin: this.fox.lanternAnchor(),
      angle: -0.42,
      range: 420,
      coneHalf: 0.4,
      tuning: { haloRadius: 200 },
    };
    drawLanternLight(ctx, light, this.palette, this.time);

    const bodies = this.wisps.map((wisp) => ({ y: wisp.y, draw: () => drawWisp(ctx, wisp, this.palette, this.time) }));
    bodies.push({ y: this.fox.y, draw: () => drawFox(ctx, this.fox, this.palette, this.time) });
    bodies.sort((a, b) => a.y - b.y);
    for (const body of bodies) body.draw();

    this.particles.draw(ctx);
    drawHorizonHaze(ctx, this.palette, this.time);
    drawVignette(ctx, this.palette);
    drawScreenShade(ctx, this.palette, 0.5);

    drawTitleLockup(ctx, this.palette, this.time, {
      top: 150,
      subtitle: 'herd the lost wisps home before nightfall',
    });

    this.drawPrompt(ctx, game);
    this.drawControls(ctx);
  }

  drawPrompt(ctx, game) {
    const pulse = 0.6 + Math.sin(this.prompt * 2.6) * 0.4;
    const y = 470;
    const w = 366;
    const x = STAGE.width / 2 - w / 2;
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.strokeStyle = rgba(this.palette.accent, 0.7);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y - 30, w, 52, 26);
    else ctx.rect(x, y - 30, w, 52);
    ctx.stroke();
    ctx.restore();
    drawText(ctx, this.starting > 0 ? 'the lantern is lit…' : 'press enter or click to begin', STAGE.width / 2, y + 2, {
      font: `600 24px ${FONT_DISPLAY}`,
      fill: mixColor(this.palette.text, this.palette.sun, 0.3),
      align: 'center',
      baseline: 'middle',
      alpha: 0.6 + pulse * 0.4,
    });
    if (game.bestScore > 0) {
      drawLabel(ctx, `best run ${formatNumber(game.bestScore)}`, STAGE.width / 2, y + 46, this.palette, {
        align: 'center',
        alpha: 0.6,
      });
    }
  }

  drawControls(ctx) {
    const y = 700;
    ctx.save();
    ctx.font = `400 15px ${FONT_UI}`;
    const items = [
      { keys: ['W', 'A', 'S', 'D'], words: 'move' },
      { keys: ['Shift'], words: 'dash' },
      { keys: ['Mouse'], words: 'aim the lantern' },
      { keys: ['Click'], words: 'flare' },
    ];
    const gap = 46;
    const widths = items.map((item) => {
      const keyWidth = item.keys.reduce((sum, key) => sum + Math.max(26, key.length * 9 + 16) + 5, 0);
      return keyWidth + 8 + ctx.measureText(item.words).width;
    });
    const total = items.reduce((sum, item, i) => sum + widths[i] + (i > 0 ? gap : 0), 0);
    let x = STAGE.width / 2 - total / 2;
    for (const [index, item] of items.entries()) {
      let kx = x;
      for (const key of item.keys) {
        const width = drawKeycap(ctx, kx, y, key, this.palette);
        kx += width + 5;
      }
      drawText(ctx, item.words, kx + 6, y + 1, {
        font: `400 15px ${FONT_UI}`,
        fill: rgba(this.palette.dim, 0.95),
        baseline: 'middle',
      });
      x += widths[index] + gap;
    }
    ctx.restore();

    drawLabel(ctx, `${DUSKS.length} dusks · three hearts · one lantern`, STAGE.width / 2, y + 44, this.palette, {
      align: 'center',
      alpha: 0.55,
    });
  }
}
