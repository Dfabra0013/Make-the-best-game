// The pack: who is on the meadow, where they came from, and the one rule they all
// obey, which is that a hound never crosses the Hollow's threshold. New hounds
// come in from the edges a few seconds apart, so a dusk escalates instead of
// starting at its hardest.

import { Hound } from '../actors/hound.js';
import { STAGE } from '../render/layout.js';

const EDGE_SPAWNS = [
  { x: STAGE.fieldLeft + 40, y: STAGE.fieldTop + 90 },
  { x: STAGE.fieldRight - 40, y: STAGE.fieldTop + 110 },
  { x: STAGE.fieldLeft + 70, y: STAGE.fieldBottom - 40 },
  { x: STAGE.fieldRight - 70, y: STAGE.fieldBottom - 50 },
  { x: STAGE.width / 2, y: STAGE.fieldTop + 70 },
];

export class HoundPack {
  constructor(rng) {
    this.rng = rng;
    this.hounds = [];
    this.queue = [];
    this.spawnTimer = 0;
    this.bites = 0;
    this.scares = 0;
  }

  get count() {
    return this.hounds.length;
  }

  /** Lays out a dusk's pack: the first hound at once, the rest one by one. */
  plan(types, { delay = 1.2 } = {}) {
    this.hounds.length = 0;
    this.queue = [];
    const order = this.rng.shuffle(types.slice());
    order.forEach((type, index) => {
      if (index === 0) this.hounds.push(this.makeHound(type, 0));
      else this.queue.push({ type, at: delay * index + this.rng.range(0, 1.4) });
    });
    this.spawnTimer = 0;
  }

  makeHound(type, slot) {
    const spot = EDGE_SPAWNS[slot % EDGE_SPAWNS.length];
    return new Hound(spot.x + this.rng.range(-40, 40), spot.y + this.rng.range(-20, 20), type, this.rng);
  }

  update(dt, world) {
    this.spawnTimer += dt;
    const pending = this.queue.filter((entry) => entry.at <= this.spawnTimer);
    if (pending.length > 0) {
      this.queue = this.queue.filter((entry) => entry.at > this.spawnTimer);
      for (const entry of pending) this.hounds.push(this.makeHound(entry.type, this.hounds.length));
    }
    for (const hound of this.hounds) hound.update(dt, world);
  }

  /** Sends every hound that can see the flare running. */
  scare(light, tuning) {
    let scared = 0;
    for (const hound of this.hounds) {
      const fear = light.inFlare(hound.x, hound.y);
      if (fear <= 0.02) continue;
      hound.fleeT = Math.max(hound.fleeT, tuning.flareFear * (hound.type === 'brute' ? 0.7 : 1) * (0.6 + fear * 0.4));
      hound.setState('flee');
      scared += 1;
    }
    this.scares += scared;
    return scared;
  }
}
