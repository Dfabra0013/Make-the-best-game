// A dusk: the scene that is the game. It owns the fox, the lantern, the flock, the
// pack and the Hollow, and it decides when a dusk is home and when the night has
// won. Everything it draws comes from the state it just stepped, so a replay of
// the same inputs draws the same frames.

import { FoxPlayer } from '../actors/fox.js';
import { ParticleField } from '../engine/particles.js';
import { Rng } from '../engine/rng.js';
import { clamp, drawText, easeOutCubic, formatNumber, mixColor, radialFill, rgba } from '../engine/draw.js';
import { FONT_DISPLAY, FONT_UI } from '../engine/draw.js';
import { WispFlock } from '../systems/flock.js';
import { HollowGate } from '../systems/hollow.js';
import { HoundPack } from '../systems/houndpack.js';
import { LanternLight } from '../systems/lantern.js';
import { drawBodies, drawFlare, drawHollow, drawLanternLight } from '../render/actors.js';
import { drawHud } from '../render/hud.js';
import { drawLabel } from '../render/ui.js';
import { STAGE } from '../render/layout.js';
import { drawMeadow, drawVignette } from '../render/meadow.js';
import { drawHorizonHaze, drawSky } from '../render/sky.js';

const COMBO_WINDOW = 3.4;
const INTRO_TIME = 2.1;

export class PlayScene {
  /** Sets up one dusk from the run it is handed. */
  enter(game) {
    this.game = game;
    this.run = game.run;
    this.level = this.run.dusk;
    this.palette = this.level.sky;
    this.rng = new Rng(0x9e3779b1 ^ (this.run.duskIndex * 7919));
    this.particles = new ParticleField(this.rng);
    this.hollow = new HollowGate(1046, 462, 104);
    this.flock = new WispFlock(this.rng);
    this.flock.populate(this.level.wisps, this.hollow);
    this.pack = new HoundPack(this.rng);
    this.pack.plan(this.level.hounds);
    this.fox = new FoxPlayer(250, 618, this.run.tuning);
    this.light = new LanternLight(this.run.tuning);
    this.light.wick = this.run.tuning.wickMax;

    this.secondsLeft = this.level.seconds;
    this.elapsed = 0;
    this.introT = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.delivered = 0;
    this.scoreAtStart = this.run.score;
    this.popups = [];
    this.shake = 0;
    this.state = 'playing';
    this.stateT = 0;
    this.dawnFlare = 0;
    this.pulseFlash = 0;
    this.wispTrailT = 0;
    this.lastDeliveryAt = -99;
  }

  /** The events the systems raise, wired to the score, the wick and the sound. */
  get worldEvents() {
    return {
      onFoxBite: (hound) => this.onFoxBite(hound),
      onScatter: (wisp, hound) => this.onScatter(wisp, hound),
    };
  }

  update(dt, game) {
    const input = game.input;
    const pressedFlare = input.hit('Mouse0', 'KeyE');
    this.elapsed += dt;
    this.introT = Math.min(INTRO_TIME, this.introT + dt);
    this.shake = Math.max(0, this.shake - dt * 2.6);
    this.pulseFlash = Math.max(0, this.pulseFlash - dt * 2);
    this.particles.update(dt);

    if (this.state === 'playing') this.updatePlaying(dt, game, input, pressedFlare);
    else this.updateEnding(dt);

    this.hollow.update(dt);
    this.updatePopups(dt);
    this.emitWispTrails(dt);
  }

  updatePlaying(dt, game, input, pressedFlare) {
    const tuning = this.run.tuning;
    this.fox.update(dt, {
      axis: input.axis(),
      wantsDash: input.hit('ShiftLeft', 'ShiftRight', 'Space', 'KeyK'),
    });
    this.light.aimAt(input.pointer.x, input.pointer.y, this.fox.lanternAnchor().x, this.fox.lanternAnchor().y - 6, dt);
    this.light.update(dt, false);
    if (pressedFlare) this.tryFlare(game);

    this.pack.update(dt, {
      fox: this.fox,
      flock: this.flock,
      light: this.light,
      hollow: this.hollow,
      tuning,
      rng: this.rng,
      events: this.worldEvents,
    });

    const delivered = this.flock.update(dt, {
      fox: this.fox,
      light: this.light,
      hollow: this.hollow,
      hounds: this.pack.hounds,
      tuning,
    });
    for (const wisp of delivered) this.collectWisp(wisp, game);

    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0 && this.combo > 1) this.combo = 1;

    this.secondsLeft = Math.max(0, this.secondsLeft - dt);
    if (this.delivered >= this.level.goal) this.finishDusk(true);
    else if (this.secondsLeft <= 0) this.finishDusk(false);
  }

  tryFlare(game) {
    if (!this.light.flare()) return;
    this.run.stats.flares += 1;
    this.particles.ring(this.light.origin.x, this.light.origin.y, {
      color: this.palette.sun,
      size: 24,
      grow: 620,
      life: 0.5,
      alpha: 0.55,
      width: 6,
    });
    const scared = this.pack.scare(this.light, this.run.tuning);
    this.shake = Math.max(this.shake, scared > 0 ? 0.5 : 0.28);
    game.playSound('flare');
  }

  collectWisp(wisp, game) {
    const points = (wisp.spec.points ?? 100) * this.combo;
    this.run.addScore(points);
    this.run.stats.delivered += 1;
    this.delivered += 1;
    this.combo = Math.min(5, this.combo + 1);
    this.comboTimer = COMBO_WINDOW;
    this.run.stats.bestCombo = Math.max(this.run.stats.bestCombo, this.combo);
    this.light.wick = Math.min(this.run.tuning.wickMax, this.light.wick + 15);
    this.hollow.cheer();
    this.popups.push({
      x: this.hollow.x - 176,
      y: this.hollow.y - 96,
      text: `+${formatNumber(points)}`,
      sub: this.combo > 1 ? `x${this.combo} streak` : 'wisp home',
      life: 1.5,
      maxLife: 1.5,
      color: this.palette.wisp,
    });
    this.particles.burst(this.hollow.x, this.hollow.y, { count: 20, color: this.palette.wisp, speed: 220, size: 2.6 });
    this.particles.ring(this.hollow.x, this.hollow.y + 10, { color: this.palette.hollow, size: 40, grow: 300, life: 0.7 });
    this.pulseFlash = 1;
    game.playSound('delivery', this.combo);
  }

  onFoxBite(hound) {
    if (!this.fox.hurt(hound.x, hound.y)) return;
    const empty = this.run.hurt(1);
    this.combo = 1;
    this.comboTimer = 0;
    this.shake = 1;
    this.particles.burst(this.fox.x, this.fox.y, { count: 16, color: this.palette.houndEye, speed: 190, size: 2.4 });
    this.particles.ring(this.fox.x, this.fox.y, { color: this.palette.houndEye, size: 16, grow: 240, life: 0.45 });
    this.popups.push({
      x: this.fox.x,
      y: this.fox.y - 48,
      text: 'bit',
      sub: null,
      life: 0.9,
      maxLife: 0.9,
      color: this.palette.houndEye,
    });
    this.game?.playSound?.('hurt');
    this.pack.bites += 1;
    if (empty) this.finishDusk(false, 'The lantern went out.');
  }

  onScatter(wisp) {
    this.run.stats.scattered += 1;
    this.particles.puff(wisp.x, wisp.y, { count: 7, color: mixColor(this.palette.wisp, this.palette.groundLow, 0.3) });
    this.particles.burst(wisp.x, wisp.y, { count: 7, color: this.palette.wisp, speed: 130, size: 1.8, life: 0.5 });
  }

  finishDusk(home, reason = null) {
    if (this.state !== 'playing') return;
    this.state = home ? 'dawn' : 'nightfall';
    this.stateT = 0;
    this.reason = reason;
    if (home) {
      this.run.heal(1);
      const bonus = Math.round(this.secondsLeft * 12 + this.run.hearts * 40);
      this.run.addScore(bonus);
      this.run.recordDusk({
        delivered: this.delivered,
        goal: this.level.goal,
        secondsLeft: this.secondsLeft,
        scoreGained: this.run.score - this.scoreAtStart,
      });
      this.popups.push({
        x: STAGE.width / 2,
        y: 300,
        text: 'all home',
        sub: `+${formatNumber(bonus)} for the light left`,
        life: 2.2,
        maxLife: 2.2,
        color: this.palette.hollow,
        big: true,
      });
    }
  }

  updateEnding(dt) {
    this.stateT += dt;
    this.particles.update(dt * 0.6);
    if (this.state === 'dawn') {
      this.dawnFlare = Math.min(1, this.stateT / 1.4);
      if (this.stateT > 2.0) this.game?.onDuskHome?.();
    } else if (this.stateT > 1.8) {
      this.game?.onDuskLost?.(this.reason ?? 'Night fell before the flock was home.');
    }
  }

  updatePopups(dt) {
    for (const popup of this.popups) {
      popup.life -= dt;
      popup.y -= dt * (popup.big ? 4 : 26);
    }
    this.popups = this.popups.filter((popup) => popup.life > 0);
  }

  /** Wisp light leaves a faint trail when it is moving. */
  emitWispTrails(dt) {
    this.wispTrailT += dt;
    if (this.wispTrailT < 0.06) return;
    this.wispTrailT = 0;
    for (const wisp of this.flock.wisps) {
      if (wisp.asleep) continue;
      const speed = Math.hypot(wisp.vx, wisp.vy);
      if (speed < 26) continue;
      this.particles.trail(wisp.x, wisp.y + 2, wisp.type === 'mote' ? '#ffffff' : this.palette.wisp, 1.4, 0.3);
    }
  }

  draw(ctx, game) {
    const shakeX = this.shake > 0 ? Math.sin(this.elapsed * 70) * this.shake * 5 : 0;
    const shakeY = this.shake > 0 ? Math.cos(this.elapsed * 61) * this.shake * 3.4 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawSky(ctx, this.palette, this.elapsed, this.run.duskIndex);
    drawMeadow(ctx, this.palette, this.elapsed);
    drawHollow(ctx, this.hollow, this.palette, this.elapsed);
    drawLanternLight(ctx, this.light, this.palette, this.elapsed);
    drawFlare(ctx, this.light, this.palette, this.elapsed);
    drawBodies(ctx, {
      fox: this.fox,
      wisps: this.flock.wisps,
      hounds: this.pack.hounds,
      palette: this.palette,
      time: this.elapsed,
    });
    this.drawDashGauge(ctx);
    this.particles.draw(ctx);
    drawHorizonHaze(ctx, this.palette, this.elapsed);
    drawVignette(ctx, this.palette);
    this.drawPopups(ctx);
    ctx.restore();

    if (this.state === 'dawn') this.drawDawnWash(ctx);
    drawHud(ctx, this.hudModel(game), this.palette, this.elapsed);
    this.drawIntro(ctx);
    if (this.state === 'nightfall') this.drawNightfallCard(ctx);
  }

  /** The little ring under the fox that fills again as the dash comes back. */
  drawDashGauge(ctx) {
    const ready = this.fox.dashReady;
    const progress = ready ? 1 : 1 - this.fox.dashCooldown / this.run.tuning.dashCooldown;
    ctx.save();
    ctx.strokeStyle = rgba(ready ? this.palette.accent : this.palette.dim, ready ? 0.55 : 0.3);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(this.fox.x, this.fox.y + 16, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(progress, 0, 1));
    ctx.stroke();
    ctx.restore();
  }

  drawPopups(ctx) {
    for (const popup of this.popups) {
      const t = 1 - popup.life / popup.maxLife;
      const alpha = popup.life < 0.4 ? popup.life / 0.4 : 1;
      const scale = popup.big ? 1 : 0.9 + easeOutCubic(Math.min(1, t * 3)) * 0.18;
      ctx.save();
      ctx.translate(popup.x, popup.y);
      ctx.scale(scale, scale);
      drawText(ctx, popup.text, 0, 0, {
        font: `600 ${popup.big ? 46 : 30}px ${FONT_DISPLAY}`,
        fill: popup.color,
        align: 'center',
        alpha,
        shadow: 12,
        shadowColor: rgba(this.palette.groundLow, 0.7),
      });
      if (popup.sub) {
        drawText(ctx, popup.sub, 0, 22, {
          font: `700 13px ${FONT_UI}`,
          fill: rgba(this.palette.text, 0.85 * alpha),
          align: 'center',
          letterSpacing: 1.6,
        });
      }
      ctx.restore();
    }
  }

  drawIntro(ctx) {
    if (this.introT >= INTRO_TIME) return;
    const fadeIn = clamp(this.introT / 0.5, 0, 1);
    const fadeOut = clamp((INTRO_TIME - this.introT) / 0.7, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    drawText(ctx, this.level.name, STAGE.width / 2, 300 + (1 - easeOutCubic(fadeIn)) * 18, {
      font: `600 54px ${FONT_DISPLAY}`,
      fill: this.palette.text,
      align: 'center',
      alpha,
      shadow: 22,
      shadowColor: rgba(this.palette.groundLow, 0.8),
    });
    drawText(ctx, this.level.subtitle, STAGE.width / 2, 338, {
      font: `400 21px ${FONT_DISPLAY}`,
      fill: rgba(this.palette.dim, alpha),
      align: 'center',
    });
    drawLabel(ctx, `${this.level.goal} wisps · ${this.level.hounds.length} hounds`, STAGE.width / 2, 372, this.palette, {
      align: 'center',
      alpha: alpha * 0.8,
    });
  }

  drawDawnWash(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = radialFill(ctx, STAGE.width / 2, STAGE.height * 0.5, 20, STAGE.width * 0.7, [
      [0, rgba(this.palette.hollow, 0.34 * this.dawnFlare)],
      [0.55, rgba(this.palette.sun, 0.16 * this.dawnFlare)],
      [1, rgba(this.palette.sun, 0)],
    ]);
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    ctx.restore();
    const alpha = clamp(this.dawnFlare * 1.4, 0, 1);
    drawText(ctx, 'All home', STAGE.width / 2, 268, {
      font: `600 58px ${FONT_DISPLAY}`,
      fill: this.palette.text,
      align: 'center',
      alpha,
      shadow: 24,
      shadowColor: rgba(this.palette.groundLow, 0.7),
    });
  }

  drawNightfallCard(ctx) {
    const t = clamp(this.stateT / 1.4, 0, 1);
    ctx.save();
    ctx.fillStyle = radialFill(ctx, STAGE.width / 2, STAGE.height / 2, 30, STAGE.width * 0.7, [
      [0, rgba(this.palette.groundLow, 0.1 * t)],
      [1, rgba(this.palette.groundLow, 0.72 * t)],
    ]);
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    ctx.restore();
    drawText(ctx, 'The night came', STAGE.width / 2, 340, {
      font: `600 56px ${FONT_DISPLAY}`,
      fill: mixColor(this.palette.houndEye, this.palette.text, 0.5),
      align: 'center',
      alpha: t,
      shadow: 22,
      shadowColor: 'rgba(0,0,0,0.6)',
    });
    if (this.reason) {
      drawText(ctx, this.reason, STAGE.width / 2, 380, {
        font: `400 20px ${FONT_DISPLAY}`,
        fill: rgba(this.palette.dim, t),
        align: 'center',
      });
    }
  }

  /** What the HUD reads, gathered in one place so the drawing stays dumb. */
  hudModel(game) {
    return {
      duskNumber: this.run.duskIndex + 1,
      duskTotal: game.duskTotal,
      duskName: this.level.name,
      delivered: this.delivered,
      goal: this.level.goal,
      hearts: this.run.hearts,
      maxHearts: this.run.maxHearts,
      wickFraction: this.light.wickFraction,
      dashReady: this.fox.dashReady,
      dashCharge: 1 - this.fox.dashCooldown / this.run.tuning.dashCooldown,
      secondsLeft: this.secondsLeft,
      secondsTotal: this.level.seconds,
      score: this.run.score,
      best: game.bestScore,
      combo: this.combo,
      comboTimer: this.comboTimer,
      comboWindow: COMBO_WINDOW,
    };
  }
}
