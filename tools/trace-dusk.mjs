import { createCanvas } from '@napi-rs/canvas';
import { WispwoodGame } from '../game/src/app.js';
import { InputState } from '../game/src/engine/input.js';
import { PlayScene } from '../game/src/scenes/play.js';
import { Autopilot } from './autopilot.mjs';

const duskIndex = Number(process.argv[2] ?? 0);
const canvas = createCanvas(64, 64);
const input = new InputState();
const game = new WispwoodGame({ ctx: canvas.getContext('2d'), input, audio: null });
game.beginRun();
game.startDusk(duskIndex);
const bot = new Autopilot();
for (let i = 0; i < 60 * 130; i++) {
  bot.drive(game, input, 1 / 60);
  game.update(1 / 60);
  if (game.sceneName !== 'play') { console.log('->', game.sceneName, game.scene?.reason ?? ''); break; }
  if (i % 300 === 0) {
    const s = game.scene;
    if (!(s instanceof PlayScene)) continue;
    const c = s.flock.center;
    const inBeam = s.flock.wisps.filter((w) => s.light.beamStrength(w.x, w.y) > 0.2).length;
    const asleep = s.flock.wisps.filter((w) => w.asleep).length;
    console.log(`t=${(i/60)|0} d=${s.delivered}/${s.level.goal} n=${s.flock.wisps.length} asleep=${asleep} beam=${inBeam} fox=(${s.fox.x|0},${s.fox.y|0}) flock=(${c.x|0},${c.y|0}) toHollow=${Math.hypot(c.x-s.hollow.x,c.y-s.hollow.y)|0} hearts=${game.run.hearts} hounds=${s.pack.hounds.length}`);
  }
}
