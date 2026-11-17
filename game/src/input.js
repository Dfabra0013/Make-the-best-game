// Keyboard and pointer input. Held keys steer; one-shot presses are queued as bit
// flags and taken once by the loop, so a press between frames is never lost.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  const pointer = { x: FIELD_CX, y: FIELD_CY, active: false };
  let actions = 0;

  function onKeyDown(event) {
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (DASH.has(event.code)) { if (!event.repeat) actions |= ACTION_DASH; }
    else if (RESTART.has(event.code)) { if (!event.repeat) actions |= ACTION_RESTART; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else if (!held.has(event.code)) held.add(event.code);
    else return;
    event.preventDefault();
  }
  function onKeyUp(event) { held.delete(event.code); }
  function onBlur() { held.clear(); }
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    // Map CSS pixels to the fixed logical playfield, independent of DPR or scale.
    pointer.x = ((event.clientX - rect.left) / rect.width) * 1280;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 720;
    pointer.active = true;
  }
  function onPointerDown(event) {
    onPointerMove(event);
    actions |= ACTION_CONFIRM;
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    pointer,
    direction() {
      const x = (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0) - (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0);
      const y = (held.has('ArrowDown') || held.has('KeyS') ? 1 : 0) - (held.has('ArrowUp') || held.has('KeyW') ? 1 : 0);
      return { x, y };
    },
    takeActions() { const taken = actions; actions = 0; return taken; },
    clearHeld() { held.clear(); },
  };
}

const FIELD_CX = 640;
const FIELD_CY = 360;
