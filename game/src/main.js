// The browser end of Wispwood: it finds the canvas, wires the keyboard and the
// mouse, unlocks the sound on the first gesture, and runs the game at a fixed 60
// steps a second so a fast monitor cannot make the dusk go by at a different speed.

import { WispwoodGame } from './app.js';
import { InputState } from './engine/input.js';
import { sounds } from './engine/audio.js';
import { STAGE } from './render/layout.js';

const STEP = 1 / 60;
const BEST_KEY = 'wispwood.best';

const canvas = document.getElementById('game');
canvas.width = STAGE.width;
canvas.height = STAGE.height;
const ctx = canvas.getContext('2d', { alpha: false });

const readBest = () => {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
};

const input = new InputState();
input.attach(canvas);

const game = new WispwoodGame({
  ctx,
  input,
  audio: sounds,
  bestScore: readBest(),
  onBestScore: (score) => {
    try {
      window.localStorage.setItem(BEST_KEY, String(Math.round(score)));
    } catch {
      /* a private window with no storage still plays */
    }
  },
});

const unlockAudio = () => {
  sounds.unlock();
  sounds.startAmbience();
};
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') sounds.toggleMute();
});

game.start();

let previous = 0;
let accumulator = 0;
let running = true;

const frame = (now) => {
  if (!running) return;
  if (previous === 0) previous = now;
  const elapsed = Math.min(0.1, (now - previous) / 1000);
  previous = now;
  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= STEP && steps < 5) {
    game.update(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  game.draw();
  requestAnimationFrame(frame);
};

// The scene is drawn once before the fonts settle so the page is never blank.
game.draw();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    game.draw();
    requestAnimationFrame(frame);
  });
} else {
  requestAnimationFrame(frame);
}

canvas.addEventListener('webglcontextlost', () => {
  running = false;
});
