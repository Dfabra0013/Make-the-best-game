// Keyboard and mouse, in one plain object the scenes read. Nothing is polled
// from an event: press and release both land in `held` / `edges` so a tap cannot
// be missed between two simulation steps.

const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class InputState {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.pointer = { x: 640, y: 560, inside: true };
    this.clicked = false;
    this.typed = [];
    this.listeners = [];
    this.attached = false;
  }

  /** Wires the DOM listeners; the render tools never call this. */
  attach(canvas) {
    if (this.attached) return;
    this.attached = true;
    const { window, document } = globalThis;
    const onKey = (event, down) => {
      if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
      if (event.repeat) return;
      if (down) {
        this.held.add(event.code);
        this.pressed.add(event.code);
        this.typed.push(event.key);
      } else {
        this.held.delete(event.code);
        this.released.add(event.code);
      }
    };
    window.addEventListener('keydown', (event) => onKey(event, true));
    window.addEventListener('keyup', (event) => onKey(event, false));
    window.addEventListener('blur', () => this.held.clear());
    canvas.addEventListener('pointermove', (event) => this.movePointer(canvas, event));
    canvas.addEventListener('pointerdown', (event) => {
      this.movePointer(canvas, event);
      this.held.add(event.button === 2 ? 'Mouse2' : 'Mouse0');
      this.pressed.add(event.button === 2 ? 'Mouse2' : 'Mouse0');
      this.clicked = true;
    });
    canvas.addEventListener('pointerup', (event) => {
      const code = event.button === 2 ? 'Mouse2' : 'Mouse0';
      this.held.delete(code);
      this.released.add(code);
    });
    canvas.addEventListener('pointerleave', () => {
      this.pointer.inside = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.held.clear();
    });
  }

  /** Canvas-relative pointer position, in the stage's own pixels. */
  movePointer(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    this.pointer.x = (event.clientX - rect.left) * scaleX;
    this.pointer.y = (event.clientY - rect.top) * scaleY;
    this.pointer.inside = true;
  }

  down(code) {
    return this.held.has(code);
  }

  /** True on the step the key went down, then false until it is pressed again. */
  hit(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  /** True on the step the key went up. */
  lifted(...codes) {
    return codes.some((code) => this.released.has(code));
  }

  /** A whole number on the step a digit was typed, else null. */
  digit() {
    for (const key of this.typed) {
      if (key >= '1' && key <= '9') return Number(key);
    }
    return null;
  }

  /** The stick the arrow keys and WASD make, normalised to length 1 at most. */
  axis() {
    let x = 0;
    let y = 0;
    for (const [code, dir] of Object.entries(MOVE_KEYS)) {
      if (!this.held.has(code)) continue;
      if (dir === 'left') x -= 1;
      if (dir === 'right') x += 1;
      if (dir === 'up') y -= 1;
      if (dir === 'down') y += 1;
    }
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  /** Called once at the end of every simulation step. */
  endStep() {
    this.pressed.clear();
    this.released.clear();
    this.typed.length = 0;
    this.clicked = false;
  }
}

/**
 * A timeline instead of a hand: the render tools replay a build so a screenshot
 * is a moment of a real session. Each frame is {from, until, hold, pointer}.
 */
export class ScriptedInput extends InputState {
  constructor(frames = []) {
    super();
    this.frames = frames;
  }

  /** Sets the state the timeline describes at `t` seconds. */
  at(t) {
    this.held.clear();
    for (const frame of this.frames) {
      const from = frame.from ?? 0;
      const until = frame.until ?? Infinity;
      if (t < from || t >= until) continue;
      for (const code of frame.hold ?? []) this.held.add(code);
      if (frame.pointer) {
        this.pointer.x = frame.pointer.x ?? this.pointer.x;
        this.pointer.y = frame.pointer.y ?? this.pointer.y;
      }
    }
  }
}
