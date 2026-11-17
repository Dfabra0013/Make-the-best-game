// The Hollow: a standing-stone doorway at the edge of the meadow where wisps go
// home. It is a place, not an object, so it owns its threshold and the little
// celebrations that answer a delivery.

import { TAU, clamp } from '../engine/draw.js';

export class HollowGate {
  constructor(x, y, radius = 82) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.delivered = 0;
    this.pulseT = 0;
    this.glow = 0;
    this.phase = 0;
  }

  /** The doorway is always open; wisps file in a few at a time. */
  get accepting() {
    return true;
  }

  /** A wisp went home: the doorway brightens and the runes take a breath. */
  cheer() {
    this.delivered += 1;
    this.pulseT = 0.9;
    this.glow = 1;
    this.swallow = 0.24;
  }

  update(dt) {
    this.phase += dt;
    this.pulseT = Math.max(0, this.pulseT - dt);
    this.glow = Math.max(0, this.glow - dt * 1.6);
  }

  /** 0 to 1, the doorway's celebration right after a delivery. */
  get pulse() {
    return clamp(this.pulseT / 0.9, 0, 1);
  }

  /** The ring of light that rolls out of the doorway on a delivery. */
  get rippleRadius() {
    return this.radius * (1 + (1 - this.pulse) * 2.4);
  }

  contains(x, y, slack = 0) {
    return Math.hypot(x - this.x, y - this.y) <= this.radius + slack;
  }

  /** Floating runes orbit the arch; this is where they are, once per rune. */
  runePosition(index, count) {
    const angle = this.phase * 0.45 + (index / count) * TAU;
    const r = this.radius * 1.12;
    return { x: this.x + Math.cos(angle) * r * 0.82, y: this.y - 34 + Math.sin(angle) * r * 0.36 };
  }
}
