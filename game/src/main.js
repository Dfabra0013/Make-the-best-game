// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer, HUD and screen layers paint the result.
// ?shot=title|play|victory|defeat&seed=N stages one deterministic scene for a
// screenshot and sets window.__shotReady once it has painted twice.
import { BEST_KEY, HUES, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_DASH, ACTION_RESTART, ACTION_MUTE,
} from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { drawHud } from './hud.js';
import { drawTitle, drawPaused, drawVictory, drawDefeat } from './screens.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage may be off */ }
}

const world = createWorld(random, readBest());
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
const state = world.state;
let muted = false;
let lastOutcome = null;
let accumulator = 0;
let last = performance.now();

function announce(message) { status.textContent = message; }

function startGame() {
  world.reset();
  state.screen = 'play';
  lastOutcome = null;
  audio.unlock();
  announce(`Prismwake. Collect ${HUES[0].name} shards. Five hues before dawn.`);
}

function handleActions(actions) {
  if (actions & ACTION_MUTE) {
    muted = audio.toggleMute();
    state.muted = muted;
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
  if (state.screen === 'title') {
    if (actions & ACTION_CONFIRM) startGame();
    return;
  }
  if (state.screen === 'victory' || state.screen === 'defeat') {
    if (actions & (ACTION_CONFIRM | ACTION_RESTART)) startGame();
    return;
  }
  if (actions & ACTION_RESTART) { startGame(); return; }
  if (state.screen === 'paused') {
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) { state.screen = 'play'; announce('Playing.'); }
    return;
  }
  if (actions & ACTION_PAUSE) { state.screen = 'paused'; announce('Paused.'); return; }
  if (actions & ACTION_DASH) world.dash();
  if (actions & ACTION_CONFIRM) {
    const events = {};
    if (world.triggerRefract(events)) {
      audio.playRefractSweep();
      announce(`Refract burst. ${events.refract.converted} Nulls converted to ${HUES[Math.min(state.hueIndex, 4)].name} shards.`);
    }
  }
}

function consumeEvents(events) {
  if (events.pickup) audio.playPickupChime(events.pickup.hue);
  if (events.hurt) audio.playHurtThud();
  if (events.restored !== undefined) {
    audio.playHueRestored(events.restored);
    announce(`${HUES[events.restored].name} restored.`);
  }
  if (state.outcome && state.outcome !== lastOutcome) {
    lastOutcome = state.outcome;
    saveBest(state.best);
    if (state.outcome === 'victory') {
      audio.playVictoryArpeggio();
      announce(`Spectrum restored. Final score ${state.score}. Press R to play again.`);
    } else {
      audio.playDefeatFall();
      announce(`The grey won. Score ${state.score}. Press R to try again.`);
    }
  }
}

function paintLayers(time) {
  renderer.draw(state, time);
  const ctx = renderer.overlay();
  if (state.screen !== 'title') drawHud(ctx, state, muted);
  if (state.screen === 'title') drawTitle(ctx, state, time);
  else if (state.screen === 'paused') drawPaused(ctx);
  else if (state.screen === 'victory') drawVictory(ctx, state);
  else if (state.screen === 'defeat') drawDefeat(ctx, state);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  const time = now / 1000;
  handleActions(input.takeActions());
  if (state.screen === 'play') {
    accumulator += dt;
    let guard = 0;
    while (accumulator >= STEP && guard < 12 && state.screen === 'play') {
      const events = world.step(STEP, input, audio);
      accumulator -= STEP;
      guard += 1;
      consumeEvents(events);
    }
  } else {
    accumulator = 0;
  }
  paintLayers(time);
}

if (shot) {
  stageShot(shot, world);
  let painted = 0;
  function paint() {
    paintLayers(performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  announce('Prismwake. Press Space or click to begin.');
  requestAnimationFrame(frame);
}
