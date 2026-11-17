// One run: the score, the hearts, the dusks behind the fox and the charms it has
// taken. The tuning every dusk is played with is read from here, so an upgrade
// is a change in one place and the systems that feel it never ask who gave it.

import { DUSKS, duskAt } from './data/dusks.js';
import { CHARMS } from './data/charms.js';

export const BASE_TUNING = {
  moveSpeed: 302,
  moveAccel: 1750,
  moveDrag: 7.2,
  dashSpeed: 780,
  dashTime: 0.15,
  dashCooldown: 1.15,
  lightRange: 330,
  coneHalf: 0.46,
  haloRadius: 152,
  pullStrong: 470,
  pullWeak: 210,
  flareRadius: 300,
  flareFear: 1.5,
  flareCost: 26,
  wickMax: 100,
  wickRegen: 3.4,
  wispSpeed: 1,
  houndSense: 1,
  maxHearts: 3,
};

export class RunState {
  constructor() {
    this.duskIndex = 0;
    this.score = 0;
    this.hearts = BASE_TUNING.maxHearts;
    this.maxHearts = BASE_TUNING.maxHearts;
    this.charms = [];
    this.stats = { delivered: 0, scattered: 0, hits: 0, flares: 0, bestCombo: 1 };
    this.duskRecords = [];
    this.tuning = { ...BASE_TUNING };
  }

  get dusk() {
    return duskAt(this.duskIndex);
  }

  get isFinalDusk() {
    return this.duskIndex >= DUSKS.length - 1;
  }

  /** Adds a charm and rebuilds the tuning from the base plus every charm taken. */
  takeCharm(charm) {
    this.charms.push(charm.id);
    const tuning = { ...BASE_TUNING };
    for (const id of this.charms) {
      const taken = CHARMS.find((charm) => charm.id === id);
      if (taken) taken.apply(tuning, this);
    }
    this.tuning = tuning;
    this.maxHearts = tuning.maxHearts;
    this.hearts = Math.min(this.hearts, this.maxHearts);
  }

  addScore(points) {
    this.score += Math.max(0, Math.round(points));
  }

  /** Returns true when the hit emptied the lantern. */
  hurt(amount = 1) {
    this.hearts = Math.max(0, this.hearts - amount);
    this.stats.hits += amount;
    return this.hearts === 0;
  }

  heal(amount = 1) {
    this.hearts = Math.min(this.maxHearts, this.hearts + amount);
  }

  /** Files how a dusk went, for the summary card. */
  recordDusk({ delivered, goal, secondsLeft, scoreGained }) {
    this.duskRecords.push({
      name: this.dusk.name,
      delivered,
      goal,
      secondsLeft: Math.max(0, Math.round(secondsLeft)),
      scoreGained: Math.round(scoreGained),
    });
  }

  get grade() {
    const completed = this.duskRecords.length;
    const total = this.duskRecords.reduce((sum, record) => sum + record.delivered, 0);
    if (completed >= DUSKS.length) return total >= 40 ? 'Dawnbringer' : 'Lantern Keeper';
    if (completed >= 3) return 'Night Warden';
    if (completed >= 2) return 'Herder';
    return 'Stray Ember';
  }
}
