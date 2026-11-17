// A wisp is a scrap of somebody's evening that has not found its way home. Left
// alone it wanders; in the lantern's beam it comes toward the fox; frightened by a
// hound it bolts. Sleepers sit still and dim until the light touches them, and
// motes are quick and skittish, so a dusk is never one kind of herding.

import { TAU } from '../engine/draw.js';

export const WISP_TYPES = {
  wisp: { label: 'wisp', speed: 66, panicSpeed: 320, turn: 3.4, radius: 15, glow: 46, wander: 0.55, points: 100, sleeps: false },
  mote: { label: 'mote', speed: 112, panicSpeed: 380, turn: 5.2, radius: 11, glow: 36, wander: 1.5, points: 130, sleeps: false },
  sleeper: { label: 'sleeper', speed: 0, panicSpeed: 250, turn: 2.2, radius: 17, glow: 26, wander: 0, points: 150, sleeps: true },
};

export class Wisp {
  constructor(x, y, type = 'wisp', rng) {
    this.type = type;
    this.spec = WISP_TYPES[type] ?? WISP_TYPES.wisp;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = this.spec.radius;
    this.asleep = this.spec.sleeps;
    this.awake = !this.spec.sleeps;
    this.phase = rng ? rng.range(0, TAU) : 0;
    this.wanderPhase = rng ? rng.range(0, 100) : 0;
    this.wanderHeading = rng ? rng.angle() : 0;
    this.panicT = 0;
    this.panicFrom = { x, y };
    this.delivered = false;
    this.bob = 0;
    this.trailT = 0;
    this.glow = this.spec.glow;
    this.warmth = 0;
  }

  get speed() {
    if (this.panicT > 0) return this.spec.panicSpeed;
    // In the beam a wisp is eager: it can keep up with the fox that leads it.
    return this.spec.speed * (1 + 1.7 * this.warmth);
  }

  get frightened() {
    return this.panicT > 0;
  }

  /** Wakes a sleeper: the light makes it a wisp for the rest of the dusk. */
  wake() {
    if (this.awake) return false;
    this.awake = true;
    this.asleep = false;
    this.glow = WISP_TYPES.wisp.glow;
    this.spec = { ...WISP_TYPES.wisp, points: WISP_TYPES.sleeper.points };
    return true;
  }

  /** Bolts away from a point for a while. */
  panic(duration, fromX, fromY) {
    this.panicT = Math.max(this.panicT, duration);
    this.panicFrom.x = fromX;
    this.panicFrom.y = fromY;
    if (this.asleep) this.wake();
  }

  /** The flock system's steering, as an acceleration this frame. */
  steer(dt, ax, ay) {
    this.vx += ax * dt;
    this.vy += ay * dt;
    const damp = Math.exp(-2.6 * dt);
    this.vx *= damp;
    this.vy *= damp;
    const speed = Math.hypot(this.vx, this.vy);
    const cap = this.speed;
    if (speed > cap) {
      this.vx = (this.vx / speed) * cap;
      this.vy = (this.vy / speed) * cap;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.bob += dt * (2 + speed * 0.02);
  }

  update(dt) {
    this.panicT = Math.max(0, this.panicT - dt);
    this.phase += dt;
    this.warmth = Math.max(0, this.warmth - dt * 0.55);
    if (this.asleep) {
      this.vx = 0;
      this.vy = 0;
    }
  }

  /** The light found it: keep a little of the warmth for the glow. */
  lighten(dt, strength) {
    this.warmth = Math.min(1, this.warmth + strength * dt * 2.2);
  }
}
