// Keyboard + pointer capture translated into per-frame player commands and UI hit-testing.

import { ARENA_HEIGHT, ARENA_WIDTH } from './config.js';
import { clamp } from './mathutil.js';

const MOVE_LEFT = ['arrowleft', 'a'];
const MOVE_RIGHT = ['arrowright', 'd'];
const MOVE_UP = ['arrowup', 'w'];
const MOVE_DOWN = ['arrowdown', 's'];
const DASH_KEYS = [' ', 'shift', 'shiftleft', 'shiftright'];
const ECHO_KEYS = ['q', 'e'];
const OVERDRIVE_KEYS = ['f'];
const PAUSE_KEYS = ['escape', 'p'];

export function screenToArenaCoords(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || ARENA_WIDTH;
  const height = rect.height || ARENA_HEIGHT;
  const x = ((clientX - rect.left) / width) * ARENA_WIDTH;
  const y = ((clientY - rect.top) / height) * ARENA_HEIGHT;
  return { x: clamp(x, 0, ARENA_WIDTH), y: clamp(y, 0, ARENA_HEIGHT) };
}

function normalizeKey(event) {
  const key = (event.key ?? '').toLowerCase();
  if (key === ' ' || event.code === 'Space') return ' ';
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') return 'shift';
  return key;
}

export function createInputController(canvas) {
  const input = {
    canvas,
    keys: new Set(),
    pressed: new Set(),
    mouseX: ARENA_WIDTH / 2,
    mouseY: ARENA_HEIGHT - 150,
    mouseDown: false,
    pointerInside: false,
    clicks: [],
  };

  const updatePointer = (event) => {
    const point = screenToArenaCoords(canvas, event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.pointerInside = true;
  };

  window.addEventListener('keydown', (event) => {
    const key = normalizeKey(event);
    if (MOVE_LEFT.concat(MOVE_RIGHT, MOVE_UP, MOVE_DOWN, DASH_KEYS, ECHO_KEYS, OVERDRIVE_KEYS, PAUSE_KEYS).includes(key)) {
      event.preventDefault();
    }
    if (!input.keys.has(key)) input.pressed.add(key);
    input.keys.add(key);
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(normalizeKey(event));
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', (event) => {
    updatePointer(event);
    input.mouseDown = true;
    input.clicks.push({ x: input.mouseX, y: input.mouseY, button: event.button });
    if (canvas.setPointerCapture && event.pointerId !== undefined) {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is a convenience; ignore unsupported environments.
      }
    }
  });
  canvas.addEventListener('pointerup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('pointerleave', () => {
    input.pointerInside = false;
    input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return input;
}

export function isAnyHeld(input, keys) {
  return keys.some((key) => input.keys.has(key));
}

export function consumeWindowKey(input, keys) {
  const match = keys.find((key) => input.pressed.has(key));
  if (!match) return false;
  input.pressed.delete(match);
  return true;
}

export function samplePlayerCommands(input, state) {
  let moveX = 0;
  let moveY = 0;
  if (isAnyHeld(input, MOVE_LEFT)) moveX -= 1;
  if (isAnyHeld(input, MOVE_RIGHT)) moveX += 1;
  if (isAnyHeld(input, MOVE_UP)) moveY -= 1;
  if (isAnyHeld(input, MOVE_DOWN)) moveY += 1;
  const length = Math.hypot(moveX, moveY);
  if (length > 0) {
    moveX /= length;
    moveY /= length;
  }

  return {
    moveX,
    moveY,
    aimX: input.mouseX,
    aimY: input.mouseY,
    firing: input.mouseDown || input.keys.has('j') || input.keys.has('z'),
    dashPressed: consumeWindowKey(input, DASH_KEYS),
    echoPressed: consumeWindowKey(input, ECHO_KEYS),
    overdrivePressed: consumeWindowKey(input, OVERDRIVE_KEYS),
    pausePressed: consumeWindowKey(input, PAUSE_KEYS),
    pointerActive: input.pointerInside,
    playerX: state.player.x,
    playerY: state.player.y,
  };
}

export function pickUiButton(state, x, y) {
  for (let i = state.uiButtons.length - 1; i >= 0; i--) {
    const button = state.uiButtons[i];
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
      return button;
    }
  }
  return null;
}

export function endInputFrame(input) {
  input.pressed.clear();
  input.clicks.length = 0;
}
