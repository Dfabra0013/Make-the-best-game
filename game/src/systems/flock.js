// The flock's steering. Each wisp feels four things, in this order of strength:
// the beam that pulls it to the fox, the fear a hound leaves behind, the Hollow
// calling it home, and the small repulsion that keeps wisps from stacking on one
// another. Everything is an acceleration, so nothing teleports and the flock
// always reads as a crowd of separate creatures.

import { Wisp } from '../actors/wisp.js';
import { clamp } from '../engine/draw.js';
import { STAGE, keepInField } from '../render/layout.js';

const SEPARATION_RADIUS = 46;
const HOLLOW_PULL_RANGE = 240;

export class WispFlock {
  constructor(rng) {
    this.rng = rng;
    this.wisps = [];
    this.scattered = 0;
  }

  get total() {
    return this.wisps.length;
  }

  get awake() {
    return this.wisps.filter((wisp) => wisp.awake).length;
  }

  add(type, x, y) {
    const wisp = new Wisp(x, y, type, this.rng);
    this.wisps.push(wisp);
    return wisp;
  }

  /** Spawns a dusk's worth of wisps across the meadow, away from the Hollow. */
  populate(mix, hollow) {
    this.wisps.length = 0;
    const entries = [];
    for (const [type, count] of Object.entries(mix)) {
      for (let i = 0; i < count; i += 1) entries.push(type);
    }
    this.rng.shuffle(entries);
    entries.forEach((type, index) => {
      const lane = (index + 0.5) / entries.length;
      let best = null;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const x = this.rng.range(STAGE.fieldLeft + 120, hollow.x - 300);
        const y = this.rng.range(STAGE.fieldTop + 90, STAGE.fieldBottom - 80);
        const dist = Math.hypot(x - hollow.x, y - hollow.y);
        const spread = best === null ? Infinity : best.spread;
        const laneMiss = Math.abs((x - STAGE.fieldLeft) / (hollow.x - STAGE.fieldLeft) - lane);
        if (dist > 330 && dist < spread + 900) {
          best = { x, y, spread: dist, laneMiss };
          if (laneMiss < 0.18) break;
        }
      }
      const spot = best ?? { x: this.rng.range(220, 760), y: this.rng.range(400, 700) };
      this.add(type, spot.x, spot.y);
    });
  }

  /** The nearest wisp to a point, within `range`. */
  nearest(x, y, range = Infinity) {
    let best = null;
    let bestDist = range;
    for (const wisp of this.wisps) {
      const d = Math.hypot(wisp.x - x, wisp.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = wisp;
      }
    }
    return best;
  }

  /**
   * Steps every wisp once. Returns the wisps that reached the Hollow this frame,
   * already taken out of the flock.
   */
  update(dt, { fox, light, hollow, hounds, tuning }) {
    const delivered = [];
    for (const wisp of this.wisps) {
      let ax = 0;
      let ay = 0;

      // A wisp's own drift: sleepy ones do not have any.
      if (wisp.awake) {
        const wander = wisp.spec.wander;
        const drift = Math.sin(wisp.wanderPhase + wisp.phase * 0.9) * 0.6 + Math.sin(wisp.phase * 0.31) * 0.4;
        wisp.wanderHeading += drift * dt * 1.4;
        ax += Math.cos(wisp.wanderHeading) * 150 * wander;
        ay += Math.sin(wisp.wanderHeading) * 150 * wander;
      }

      // The lantern. The cone pulls hard, the little halo around the fox pulls a little.
      const beam = light.beamStrength(wisp.x, wisp.y);
      const halo = light.haloStrength(wisp.x, wisp.y);
      if (beam > 0.02 && wisp.asleep) wisp.wake();
      if (beam > 0 || halo > 0) {
        // A wisp follows the light only as far as it trusts it: warmth is the trust.
        const trust = 0.5 + 0.5 * wisp.warmth;
        const pull = (tuning.pullStrong * beam + tuning.pullWeak * halo * 0.6) * trust;
        const dist = Math.hypot(fox.x - wisp.x, fox.y - wisp.y) || 1;
        ax += ((fox.x - wisp.x) / dist) * pull;
        ay += ((fox.y - wisp.y) / dist) * pull;
        wisp.lighten(dt, Math.max(beam, halo * 0.7));
      }

      // A coward runs from whatever frightened it, even into the light.
      if (wisp.panicT > 0) {
        const dx = wisp.x - wisp.panicFrom.x;
        const dy = wisp.y - wisp.panicFrom.y;
        const dist = Math.hypot(dx, dy) || 1;
        ax += (dx / dist) * 620;
        ay += (dy / dist) * 620;
      }

      // The Hollow calls: the last stretch of the trip should feel like a landing.
      const hx = hollow.x - wisp.x;
      const hy = hollow.y - wisp.y;
      const hdist = Math.hypot(hx, hy) || 1;
      if (hdist < HOLLOW_PULL_RANGE) {
        const pull = 520 * (1 - hdist / HOLLOW_PULL_RANGE) ** 0.9;
        ax += (hx / hdist) * pull;
        ay += (hy / hdist) * pull;
      } else if (wisp.awake) {
        // The doorway is never quite out of a wisp's mind: a slow drift toward it.
        const drift = 55 * (1 - Math.min(1, hdist / 1500));
        ax += (hx / hdist) * drift;
        ay += (hy / hdist) * drift;
      }

      // Hounds make a hole in the grass a wisp will not cross.
      for (const hound of hounds) {
        const dx = wisp.x - hound.x;
        const dy = wisp.y - hound.y;
        const dist = Math.hypot(dx, dy);
        const reach = 170 + hound.radius;
        if (dist > reach) continue;
        const push = 780 * (1 - dist / reach);
        ax += (dx / (dist || 1)) * push;
        ay += (dy / (dist || 1)) * push;
        if (dist < reach * 0.62 && wisp.panicT < 0.3) wisp.panic(0.9, hound.x, hound.y);
      }

      // Soft separation, so twenty wisps still look like twenty wisps.
      for (const other of this.wisps) {
        if (other === wisp) continue;
        const dx = wisp.x - other.x;
        const dy = wisp.y - other.y;
        const dist = Math.hypot(dx, dy);
        if (dist > SEPARATION_RADIUS || dist === 0) continue;
        const push = 190 * (1 - dist / SEPARATION_RADIUS);
        ax += (dx / dist) * push;
        ay += (dy / dist) * push;
      }

      wisp.update(dt);
      wisp.steer(dt, ax, ay);
      // Warmth fades fast outside the light, so the boost is the beam's doing.
      wisp.warmth = clamp(wisp.warmth, 0, 1);
      const held = keepInField(wisp.x, wisp.y, wisp.radius);
      wisp.x = held.x;
      wisp.y = held.y;

      if (delivered.length === 0 && hollow.accepting && Math.hypot(hollow.x - wisp.x, hollow.y - wisp.y) < hollow.radius * 0.72) {
        delivered.push(wisp);
      }
    }

    if (delivered.length > 0) {
      this.wisps = this.wisps.filter((wisp) => !delivered.includes(wisp));
      for (const wisp of delivered) wisp.delivered = true;
    }
    return delivered;
  }

  /** The average position of the flock, for the hounds and for a soft camera glow. */
  get center() {
    if (this.wisps.length === 0) return { x: STAGE.width / 2, y: STAGE.height * 0.62 };
    const sum = this.wisps.reduce((acc, wisp) => ({ x: acc.x + wisp.x, y: acc.y + wisp.y }), { x: 0, y: 0 });
    return { x: sum.x / this.wisps.length, y: sum.y / this.wisps.length };
  }
}
