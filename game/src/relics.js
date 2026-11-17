// Eighteen synergistic Chrono-Relics plus weighted drafting and modifier aggregation.

export const RELIC_CATALOG = [
  {
    id: 'sunforged-lens',
    name: 'Sunforged Lens',
    tier: 1,
    icon: 'bolt',
    blurb: '+12% weapon damage. Focused light cuts deeper.',
    effects: { damageMul: 1.12 },
  },
  {
    id: 'chronometer-spring',
    name: 'Chronometer Spring',
    tier: 1,
    icon: 'clock',
    blurb: '-12% weapon cooldown between volleys.',
    effects: { cooldownMul: 0.88 },
  },
  {
    id: 'aegis-filament',
    name: 'Aegis Filament',
    tier: 1,
    icon: 'shield',
    blurb: '+35 maximum shield. Regenerates after 2.4s calm.',
    effects: { maxShieldBonus: 35 },
  },
  {
    id: 'echo-bell',
    name: 'Echo Bell',
    tier: 1,
    icon: 'echo',
    blurb: '+30% Time-Echo charge from every shard and kill.',
    effects: { echoChargeMul: 1.3 },
  },
  {
    id: 'gilded-magnet',
    name: 'Gilded Magnet',
    tier: 1,
    icon: 'comet',
    blurb: '+92px shard attraction and +12% shard value.',
    effects: { shardMagnetBonus: 92, shardValueMul: 1.12 },
  },
  {
    id: 'prism-etching',
    name: 'Prism Etching',
    tier: 1,
    icon: 'prism',
    blurb: '+35% damage on every Astrolabe Prism refraction.',
    effects: { prismDamageMul: 1.35 },
  },
  {
    id: 'comet-spurs',
    name: 'Comet Spurs',
    tier: 1,
    icon: 'dash',
    blurb: '-18% Phase-Dash cooldown. Leave a brighter trail.',
    effects: { dashCooldownMul: 0.82 },
  },
  {
    id: 'gravity-well',
    name: 'Gravity Well',
    tier: 2,
    icon: 'core',
    blurb: '+1 projectile per volley, but +6% cooldown.',
    effects: { projectileBonus: 1, cooldownMul: 1.06 },
  },
  {
    id: 'twin-sundial',
    name: 'Twin Sundial',
    tier: 2,
    icon: 'echo',
    blurb: '+1.0s Time-Echo duration and +15% echo damage.',
    effects: { echoDurationBonusSec: 1.0, echoDamageMul: 1.15 },
  },
  {
    id: 'mirrored-ka',
    name: 'Mirrored Ka',
    tier: 2,
    icon: 'echo',
    blurb: 'Echo bolts pierce +1 target and gain +12% damage.',
    effects: { echoPierceBonus: 1, echoDamageMul: 1.12 },
  },
  {
    id: 'hollow-star',
    name: 'Hollow Star',
    tier: 2,
    icon: 'bolt',
    blurb: '+18% weapon damage. Cast a longer shadow.',
    effects: { damageMul: 1.18 },
  },
  {
    id: 'vesper-plating',
    name: 'Vesper Plating',
    tier: 2,
    icon: 'shield',
    blurb: '+40 hull and 8% damage reduction.',
    effects: { maxHullBonus: 40, damageReduction: 0.08 },
  },
  {
    id: 'paradox-splinter',
    name: 'Paradox Splinter',
    tier: 2,
    icon: 'core',
    blurb: '+12% critical chance for double damage.',
    effects: { critChance: 0.12 },
  },
  {
    id: 'resonance-coil',
    name: 'Resonance Coil',
    tier: 2,
    icon: 'clock',
    blurb: '+25% Overdrive gain and +8% fire rate.',
    effects: { overdriveGainMul: 1.25, cooldownMul: 0.92 },
  },
  {
    id: 'solar-crown',
    name: 'Solar Crown',
    tier: 3,
    icon: 'bolt',
    blurb: '+30% weapon damage and every bolt pierces +1 enemy.',
    effects: { damageMul: 1.3, pierceBonus: 1 },
  },
  {
    id: 'eternal-orbit',
    name: 'Eternal Orbit',
    tier: 3,
    icon: 'prism',
    blurb: '+2 projectiles per volley and -10% cooldown.',
    effects: { projectileBonus: 2, cooldownMul: 0.9 },
  },
  {
    id: 'hourglass-heart',
    name: 'Hourglass Heart',
    tier: 3,
    icon: 'echo',
    blurb: 'Repair 3 hull per kill and raise max hull by 20.',
    effects: { lifestealPerKill: 3, maxHullBonus: 20 },
  },
  {
    id: 'eclipse-sigil',
    name: 'Eclipse Sigil',
    tier: 3,
    icon: 'core',
    blurb: '+15% damage, +50% score and +25% combo gain.',
    effects: { damageMul: 1.15, scoreMul: 1.5, comboGainMul: 1.25 },
  },
];

const MULTIPLICATIVE_KEYS = new Set([
  'damageMul',
  'cooldownMul',
  'moveSpeedMul',
  'echoChargeMul',
  'echoDamageMul',
  'prismDamageMul',
  'dashCooldownMul',
  'shardValueMul',
  'scoreMul',
  'comboGainMul',
  'overdriveGainMul',
]);

export function createEmptyModifiers() {
  return {
    damageMul: 1,
    cooldownMul: 1,
    moveSpeedMul: 1,
    echoChargeMul: 1,
    echoDamageMul: 1,
    prismDamageMul: 1,
    dashCooldownMul: 1,
    shardValueMul: 1,
    scoreMul: 1,
    comboGainMul: 1,
    overdriveGainMul: 1,
    maxHullBonus: 0,
    maxShieldBonus: 0,
    echoDurationBonusSec: 0,
    echoPierceBonus: 0,
    shardMagnetBonus: 0,
    projectileBonus: 0,
    pierceBonus: 0,
    critChance: 0,
    critMultiplier: 2,
    lifestealPerKill: 0,
    damageReduction: 0,
  };
}

export function computeRelicModifiers(state) {
  const modifiers = createEmptyModifiers();
  for (const relic of state.relics) {
    for (const key of Object.keys(relic.effects)) {
      const value = relic.effects[key];
      if (!(key in modifiers)) continue;
      if (MULTIPLICATIVE_KEYS.has(key)) {
        modifiers[key] *= value;
      } else {
        modifiers[key] += value;
      }
    }
  }
  return modifiers;
}

function tierWeight(tier, waveNumber) {
  if (tier === 1) return Math.max(2, 10 - waveNumber * 0.4);
  if (tier === 2) return Math.min(9, 3 + waveNumber * 0.5);
  return Math.min(6, Math.max(0.6, waveNumber - 2.5));
}

export function rollRelicDraftChoices(state, count = 3) {
  const owned = new Set(state.relics.map((relic) => relic.id));
  const pool = RELIC_CATALOG.filter((relic) => !owned.has(relic.id));
  const choices = [];
  const remaining = pool.slice();
  while (choices.length < count && remaining.length > 0) {
    let totalWeight = 0;
    for (const relic of remaining) totalWeight += tierWeight(relic.tier, state.wave);
    let ticket = state.rng() * totalWeight;
    let pickedIndex = 0;
    for (let i = 0; i < remaining.length; i++) {
      ticket -= tierWeight(remaining[i].tier, state.wave);
      if (ticket <= 0) {
        pickedIndex = i;
        break;
      }
      pickedIndex = i;
    }
    choices.push(remaining[pickedIndex]);
    remaining.splice(pickedIndex, 1);
  }
  return choices;
}

export function applySelectedRelic(state, relicId) {
  const chosen = RELIC_CATALOG.find((relic) => relic.id === relicId);
  if (!chosen) return null;
  if (state.relics.some((relic) => relic.id === relicId)) return null;
  state.relics.push(chosen);
  const modifiers = computeRelicModifiers(state);
  const player = state.player;
  const previousMaxHull = player.maxHull;
  const previousMaxShield = player.maxShield;
  const nextMaxHull = player.chassis.maxHull + modifiers.maxHullBonus;
  const nextMaxShield = player.chassis.maxShield + modifiers.maxShieldBonus;
  player.maxHull = nextMaxHull;
  player.maxShield = nextMaxShield;
  player.hull = Math.min(nextMaxHull, player.hull + Math.max(0, nextMaxHull - previousMaxHull) + 12);
  player.shield = Math.min(nextMaxShield, player.shield + Math.max(0, nextMaxShield - previousMaxShield) + 10);
  return chosen;
}

export function relicTierLabel(tier) {
  return tier === 3 ? 'MYTHIC' : tier === 2 ? 'RARE' : 'COMMON';
}
