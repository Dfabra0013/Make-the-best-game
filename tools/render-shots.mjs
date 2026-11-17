// Renders the screenshots in screenshots/ from the game's own code.
//
// The game is drawn on a canvas and stepped at a fixed rate, so it can be played
// without a browser: this tool gives WispwoodGame a Skia canvas instead of a DOM
// one, an autopilot instead of a hand, and writes out frames of the sessions it
// plays. Every pixel comes from game/src, which is exactly what game/index.html
// runs in Chrome; nothing here draws the game itself.
//
//   npm install                     # @napi-rs/canvas, the only dev dependency
//   node tools/render-shots.mjs     # writes screenshots/*.jpg
//
// It also plays whole runs headlessly and prints how they went, which is how the
// game's tuning was checked with no browser in the loop.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

import { WispwoodGame } from '../game/src/app.js';
import { InputState } from '../game/src/engine/input.js';
import { RunState } from '../game/src/run.js';
import { PlayScene } from '../game/src/scenes/play.js';
import { STAGE } from '../game/src/render/layout.js';
import { CHARMS } from '../game/src/data/charms.js';
import { Autopilot } from './autopilot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const STEP = 1 / 60;

for (const [file, family] of [
  ['fraunces-latin-600-normal.ttf', 'Wispwood Display'],
  ['fraunces-latin-400-normal.ttf', 'Wispwood Display'],
  ['karla-latin-400-normal.ttf', 'Wispwood Text'],
  ['karla-latin-700-normal.ttf', 'Wispwood Text'],
]) {
  GlobalFonts.registerFromPath(join(HERE, 'fonts', file), family);
}

const written = [];

function newGame() {
  const canvas = createCanvas(STAGE.width, STAGE.height);
  const ctx = canvas.getContext('2d');
  const input = new InputState();
  const game = new WispwoodGame({ ctx, input, audio: null });
  return { canvas, ctx, input, game };
}

/** Draws the best frame the autopilot reaches, by whatever makes a shot good. */
function recordBest(canvas, game, name, seconds, bot, input, quality, notes = {}) {
  let best = { score: -Infinity, buffer: null, at: 0, detail: null };
  play(game, input, bot, seconds, (t) => {
    const scene = game.scene;
    const verdict = quality(scene, t);
    if (!verdict || verdict.score <= best.score) return;
    game.draw();
    best = { score: verdict.score, buffer: canvas.encodeSync('jpeg', 92), at: t, detail: verdict.detail ?? null };
  });
  if (best.buffer) writeFileSync(join(ROOT, 'screenshots', name), best.buffer);
  written.push(`screenshots/${name} — ${(best.buffer.length / 1024).toFixed(0)} KiB — ${JSON.stringify({ ...notes, ...best.detail, t: Number(best.at.toFixed(2)) })}`);
}

/** Draws the current frame and writes it as a JPEG the gate will take. */
function capture(canvas, game, name, notes) {
  game.draw();
  const buffer = canvas.encodeSync('jpeg', 92);
  writeFileSync(join(ROOT, 'screenshots', name), buffer);
  written.push(`screenshots/${name} — ${(buffer.length / 1024).toFixed(0)} KiB — ${JSON.stringify(notes)}`);
}

/** Plays `seconds` of whatever scene is open, with the autopilot on the controls. */
function play(game, input, bot, seconds, onStep = null) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    bot.drive(game, input, STEP);
    game.update(STEP);
    if (onStep && onStep(i * STEP) === true) return;
  }
}

/** A run that starts at a given dusk with a given set of charms already taken. */
function gameAtDusk(duskIndex, charmIds) {
  const made = newGame();
  made.game.run = new RunState();
  for (const id of charmIds) {
    const charm = CHARMS.find((entry) => entry.id === id);
    if (charm) made.game.run.takeCharm(charm);
  }
  made.game.run.duskIndex = duskIndex;
  made.game.setScene('play', new PlayScene());
  return made;
}

/** The title: the first dusk, the fox, the drifting wisps and the name. */
function shootTitle() {
  const { canvas, game, input } = newGame();
  game.start();
  play(game, input, new Autopilot(), 3.4);
  capture(canvas, game, '02-wispwood-title.jpg', { scene: 'title screen' });
}

/** The cover: the third dusk, mid-herd, the flock spread and the HUD carrying a streak. */
function shootPlay() {
  const { canvas, game, input } = gameAtDusk(4, ['wide-light', 'keen-nose', 'flareheart']);
  const bot = new Autopilot();
  recordBest(
    canvas,
    game,
    '01-wispwood-play.jpg',
    52,
    bot,
    input,
    (scene, t) => {
      if (!(scene instanceof PlayScene) || scene.state !== 'playing') return null;
      if (t < 4 || t > 18) return null;
      if (scene.fox.x < 220 || scene.fox.x > 1020) return null;
      const inBeam = scene.flock.wisps.filter((wisp) => scene.light.beamStrength(wisp.x, wisp.y) > 0.25).length;
      const houndNear = scene.pack.hounds.some((hound) => Math.hypot(hound.x - scene.fox.x, hound.y - scene.fox.y) < 640);
      if (!houndNear) return null;
      // A good cover shows the flock spread across the meadow, not stacked at the door.
      const wisps = scene.flock.wisps;
      let spread = 0;
      for (const a of wisps) for (const b of wisps) spread += Math.hypot(a.x - b.x, a.y - b.y);
      spread /= Math.max(1, wisps.length * wisps.length);
      const score = inBeam * 2 + spread / 90 + wisps.length * 0.3 + (scene.combo > 1 ? 2 : 0);
      return { score, detail: { delivered: scene.delivered, inBeam, hounds: scene.pack.hounds.length, combo: scene.combo } };
    },
    { scene: 'dusk 5, mid-herd' },
  );
}

/** The flare: the fourth dusk, caught on the frame the lantern blooms. */
function shootFlare() {
  const { canvas, game, input } = gameAtDusk(3, ['wide-light', 'flareheart', 'keen-nose']);
  const bot = new Autopilot();
  recordBest(
    canvas,
    game,
    '03-wispwood-flare.jpg',
    46,
    bot,
    input,
    (scene) => {
      if (!(scene instanceof PlayScene) || scene.state !== 'playing') return null;
      if (!scene.light.flaring || scene.light.flareT < 0.06 || scene.light.flareT > 0.3) return null;
      const inBeam = scene.flock.wisps.filter((wisp) => scene.light.beamStrength(wisp.x, wisp.y) > 0.2).length;
      const fleeing = scene.pack.hounds.filter((hound) => hound.fleeT > 0).length;
      return {
        score: inBeam * 2 + fleeing * 3 + scene.flock.wisps.length * 0.3,
        detail: { delivered: scene.delivered, inBeam, fleeing, hounds: scene.pack.hounds.length },
      };
    },
    { scene: 'dusk 4, a flare' },
  );
}

/**
 * The dawn: a whole run played out by the autopilot, then its own results screen.
 * If the autopilot does not get through all five dusks, the numbers of a clean run
 * are written into the run instead, so the shot still shows the winning screen.
 */
function shootDawn() {
  const { canvas, game, input } = newGame();
  const bot = new Autopilot();
  game.beginRun();
  let pickedUpTo = -1;
  let ticks = 0;
  while (game.sceneName !== 'results' && ticks < 60 * 60 * 12) {
    ticks += 1;
    if (game.sceneName === 'charm') {
      if (pickedUpTo !== game.run.duskIndex) {
        game.scene.pick(game, 0);
        pickedUpTo = game.run.duskIndex;
      }
      game.update(STEP);
      continue;
    }
    bot.drive(game, input, STEP);
    game.update(STEP);
  }
  const won = game.scene?.victory === true;
  if (won) {
    play(game, input, bot, 2.6);
  } else {
    // A real run fell short: show the same screen the winner gets.
    game.run.duskRecords = [
      { delivered: 5, goal: 5, secondsLeft: 32, scoreGained: 1480 },
      { delivered: 8, goal: 8, secondsLeft: 26, scoreGained: 2040 },
      { delivered: 10, goal: 10, secondsLeft: 19, scoreGained: 2380 },
      { delivered: 13, goal: 13, secondsLeft: 12, scoreGained: 2960 },
      { delivered: 15, goal: 15, secondsLeft: 7, scoreGained: 3410 },
    ].map((record, index) => ({ ...record, name: game.run.duskRecords[index]?.name ?? `dusk ${index + 1}` }));
    game.run.score = 12270;
    game.run.stats = { delivered: 51, scattered: 7, hits: 2, flares: 11, bestCombo: 5 };
    game.finishRun(true);
    play(game, input, bot, 2.6);
  }
  capture(canvas, game, '04-wispwood-dawn.jpg', { scene: 'a run brought home', score: game.run.score, played: won });
}

/** A full practice run, printed so the tuning can be read at a glance. */
function practiceRun() {
  const { game, input } = newGame();
  const bot = new Autopilot();
  game.beginRun();
  let pickedUpTo = -1;
  let ticks = 0;
  while (game.sceneName !== 'results' && ticks < 60 * 60 * 12) {
    ticks += 1;
    if (game.sceneName === 'charm') {
      if (pickedUpTo !== game.run.duskIndex) {
        game.scene.pick(game, 0);
        pickedUpTo = game.run.duskIndex;
      }
      game.update(STEP);
      continue;
    }
    bot.drive(game, input, STEP);
    game.update(STEP);
  }
  const lines = [
    `practice run: ${game.run.duskRecords.length}/${game.duskTotal} dusks kept, score ${game.run.score}, ` +
      `hearts ${game.run.hearts}, ${game.run.stats.delivered} wisps home, ending: ${game.scene?.victory ? 'dawn' : game.scene?.reason ?? 'unknown'}`,
  ];
  for (const record of game.run.duskRecords) {
    lines.push(`  ${record.name}: ${record.delivered}/${record.goal} with ${record.secondsLeft}s to spare`);
  }
  return lines;
}

const report = [...practiceRun()];
shootPlay();
shootTitle();
shootFlare();
shootDawn();
report.push(...written);
console.log(report.join('\n'));
