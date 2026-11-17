// Charms are the only upgrades: after each dusk the fox chooses one of three,
// and each one changes a number in the tuning the next dusk is played with. Every
// charm is a sentence about the same lamp, so the choice is never a mystery.

export const CHARMS = [
  {
    id: 'wide-light',
    name: 'Wide Light',
    idea: 'The lantern reaches further and spreads wider, so more of the flock stays in the beam.',
    icon: 'beam',
    apply(tuning) {
      tuning.lightRange += 95;
      tuning.coneHalf += 0.06;
    },
  },
  {
    id: 'deep-wick',
    name: 'Deep Wick',
    idea: 'A taller reservoir of light: flaring costs the same, but the wick is slower to run dry.',
    icon: 'wick',
    apply(tuning) {
      tuning.wickMax += 50;
      tuning.wickRegen += 1.8;
    },
  },
  {
    id: 'swift-paws',
    name: 'Swift Paws',
    idea: 'The fox runs faster and its dash comes back sooner, for cutting a hound off at the pass.',
    icon: 'paw',
    apply(tuning) {
      tuning.moveSpeed *= 1.14;
      tuning.dashCooldown *= 0.7;
    },
  },
  {
    id: 'flareheart',
    name: 'Flareheart',
    idea: 'A flare blooms wider and the hounds fear it for longer, buying room to turn a pack around.',
    icon: 'flare',
    apply(tuning) {
      tuning.flareRadius += 95;
      tuning.flareFear += 0.65;
    },
  },
  {
    id: 'keen-nose',
    name: 'Keen Nose',
    idea: 'Wisps feel the lantern harder: the flock gathers quicker and holds its shape in the beam.',
    icon: 'nose',
    apply(tuning) {
      tuning.pullStrong *= 1.4;
      tuning.pullWeak *= 1.45;
    },
  },
  {
    id: 'lantern-heart',
    name: 'Lantern Heart',
    idea: 'One more heart in the lantern, and it comes back full: a stolen breath before the dark.',
    icon: 'heart',
    apply(tuning, run) {
      tuning.maxHearts += 1;
      run.hearts = Math.min(tuning.maxHearts, run.hearts + 1);
    },
  },
  {
    id: 'hush-step',
    name: 'Hush Step',
    idea: 'The fox moves like ash on the grass: hounds notice it from much nearer than before.',
    icon: 'step',
    apply(tuning) {
      tuning.houndSense *= 0.68;
    },
  },
];

/** The charms a fox may still choose, dealt three at a time. */
export function dealCharms(rng, taken, count = 3) {
  const owned = new Set(taken);
  const pool = rng.shuffle(CHARMS.filter((charm) => !owned.has(charm.id)));
  if (pool.length >= count) return pool.slice(0, count);
  const filler = rng.shuffle(CHARMS.slice());
  return [...pool, ...filler.slice(0, count - pool.length)];
}

/** The charm a run already took, by id. */
export function charmById(id) {
  return CHARMS.find((charm) => charm.id === id) ?? null;
}
