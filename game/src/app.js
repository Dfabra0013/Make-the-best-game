// The game itself, without a browser in it: it holds the run, the scene stack and
// the sound, and it is driven by update(dt) and draw(). main.js gives it a real
// canvas and a real clock; tools/render-shots.mjs gives it a still one, which is how
// the screenshots in screenshots/ are made from the same code the browser runs.

import { DUSKS } from './data/dusks.js';
import { RunState } from './run.js';
import { TitleScene } from './scenes/title.js';
import { PlayScene } from './scenes/play.js';
import { CharmScene } from './scenes/charm.js';
import { ResultsScene } from './scenes/results.js';
import { STAGE } from './render/layout.js';
import { rgba } from './engine/draw.js';

export class WispwoodGame {
  constructor({ ctx, input, audio = null, bestScore = 0, onBestScore = null }) {
    this.ctx = ctx;
    this.input = input;
    this.audio = audio;
    this.bestScore = bestScore;
    this.onBestScore = onBestScore;
    this.run = new RunState();
    this.scene = null;
    this.sceneName = '';
    this.time = 0;
    this.fade = 1;
    this.paused = false;
  }

  get duskTotal() {
    return DUSKS.length;
  }

  /** Opens a scene by name and hands it the parameters it needs to set up. */
  setScene(name, scene, params = {}) {
    this.sceneName = name;
    this.scene = scene;
    this.fade = 1;
    scene.enter(this, params);
  }

  start() {
    this.setScene('title', new TitleScene());
  }

  /** A fresh run: full hearts, no charms, the first dusk. */
  beginRun() {
    this.run = new RunState();
    this.startDusk(0);
  }

  startDusk(index) {
    this.run.duskIndex = Math.min(DUSKS.length - 1, Math.max(0, index));
    if (index > 0) this.run.heal(1);
    this.setScene('play', new PlayScene());
  }

  /** Called by the play scene when a dusk's quota is home. */
  onDuskHome() {
    if (this.run.isFinalDusk) {
      this.finishRun(true);
      return;
    }
    this.setScene('charm', new CharmScene());
  }

  /** Called by the play scene when the light runs out or night falls early. */
  onDuskLost(reason) {
    this.finishRun(false, reason);
  }

  finishRun(victory, reason = null) {
    if (victory) this.playSound('duskComplete');
    else this.playSound('defeat');
    if (this.run.score > this.bestScore) {
      this.bestScore = this.run.score;
      if (this.onBestScore) this.onBestScore(this.bestScore);
    }
    this.setScene('results', new ResultsScene(), { victory, reason });
  }

  startTitle() {
    this.setScene('title', new TitleScene());
  }

  /** One fixed simulation step. */
  update(dt) {
    this.time += dt;
    this.fade = Math.max(0, this.fade - dt * 2.6);
    if (this.scene) this.scene.update(dt, this);
    this.input.endStep();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, STAGE.width, STAGE.height);
    if (this.scene) this.scene.draw(ctx, this);
    if (this.fade > 0) {
      ctx.fillStyle = rgba('#08060f', this.fade * 0.85);
      ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    }
  }

  /** Sounds are named here so the scenes never touch the audio API directly. */
  playSound(name, detail) {
    if (!this.audio) return;
    switch (name) {
      case 'delivery':
        this.audio.delivery(detail ?? 1);
        break;
      case 'flare':
        this.audio.breath({ gain: 0.22, duration: 0.5, from: 1200, to: 180 });
        break;
      case 'hurt':
        this.audio.growl(110, 0.5);
        break;
      case 'charm':
        this.audio.charm();
        break;
      case 'duskComplete':
        this.audio.duskComplete();
        break;
      case 'defeat':
        this.audio.defeat();
        break;
      case 'chirp':
        this.audio.wispChirp();
        break;
      case 'click':
      default:
        this.audio.click();
        break;
    }
  }
}
