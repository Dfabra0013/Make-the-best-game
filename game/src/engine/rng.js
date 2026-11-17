// Seeded randomness. Every roll in Wispwood comes from here, so a dusk plays the
// same way twice: the tools in tools/ replay a run and the screenshots in
// screenshots/ are renders of those replays.

export const TAU = Math.PI * 2;

/** A mulberry32 stream plus the handful of rolls the game needs. */
export class Rng {
  constructor(seed = 0x5eed) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  /** A float in [0, 1). */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A float in [lo, hi). */
  range(lo, hi) {
    return lo + this.next() * (hi - lo);
  }

  /** A whole number in [lo, hi], both ends included. */
  int(lo, hi) {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** True with probability p. */
  chance(p) {
    return this.next() < p;
  }

  /** An angle in [0, TAU). */
  angle() {
    return this.next() * TAU;
  }

  /** An element of a non-empty array. */
  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }

  /** A copy of an array, shuffled in place by a fresh stream. */
  shuffle(items) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** A point inside a rectangle. */
  point(x, y, w, h) {
    return { x: x + this.next() * w, y: y + this.next() * h };
  }
}

/** Smooth 1D value noise in [0, 1]: sway for grass, drift for pollen. */
export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash01(i);
  const b = hash01(i + 1);
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

function hash01(n) {
  let t = (n | 0) * 374761393 + 668265263;
  t = (t ^ (t >>> 13)) * 1274126177;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
