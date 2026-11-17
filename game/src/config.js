// Tuned gameplay constants, selectable Skiff chassis, Astral Realms, and wave campaign schedule.

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 800;
export const ARENA_CENTER_X = 640;
export const ARENA_CENTER_Y = 432;
export const ARENA_RADIUS = 330;

export const GAME_CONFIG = {
  fixedStepSec: 1 / 60,
  maxFrameDeltaSec: 0.05,
  echoHistoryFrames: 300, // 5.0 seconds at 60 Hz
  echoChargeMax: 100,
  echoSummonCost: 50,
  overdriveChargeMax: 100,
  grazeRadiusBonus: 24,
  comboDecaySec: 4.4,
  comboStepPerKill: 0.25,
  maxComboMultiplier: 12,
  campaignTotalWaves: 9,
};

export const CHASSIS_LOADOUTS = [
  {
    id: 'solar-lance',
    name: 'SOLAR LANCE',
    role: 'Tactical Vanguard',
    tagline: 'Twin high-velocity lances & rapid Phase-Dash',
    primaryColor: '#ffbe3b',
    accentColor: '#38f2ff',
    maxHull: 120,
    maxShield: 45,
    moveSpeed: 315,
    fireCooldownSec: 0.145,
    dashCooldownSec: 1.05,
    bulletDamage: 16,
    bulletSpeed: 672,
    echoDurationBonus: 1.0,
    prismBonusDamage: 1.35,
    stats: { firepower: 4, agility: 5, echoSync: 4 },
  },
  {
    id: 'astraea-prism',
    name: 'ASTRAEA PRISM',
    role: 'Chrono Arcanist',
    tagline: 'Tri-fan refractive bolts & extended Time-Echoes',
    primaryColor: '#38f2ff',
    accentColor: '#c97bff',
    maxHull: 105,
    maxShield: 60,
    moveSpeed: 295,
    fireCooldownSec: 0.205,
    dashCooldownSec: 1.2,
    bulletDamage: 12.5,
    bulletSpeed: 612,
    echoDurationBonus: 1.32,
    prismBonusDamage: 1.5,
    stats: { firepower: 4, agility: 4, echoSync: 5 },
  },
  {
    id: 'orbital-bastion',
    name: 'ORBITAL BASTION',
    role: 'Siege Sovereign',
    tagline: 'Explosive solar mortar & bullet-clearing Dash Nova',
    primaryColor: '#ff6b4a',
    accentColor: '#ffd166',
    maxHull: 150,
    maxShield: 55,
    moveSpeed: 268,
    fireCooldownSec: 0.29,
    dashCooldownSec: 1.3,
    bulletDamage: 32,
    bulletSpeed: 536,
    echoDurationBonus: 1.05,
    prismBonusDamage: 1.3,
    stats: { firepower: 5, agility: 3, echoSync: 4 },
  },
];

export const REALM_THEMES = [
  {
    id: 'sunlit-astrolabe',
    actLabel: 'ACT I',
    name: 'SUNLIT ASTROLABE',
    subtitle: 'Brass Meridians & Refractive Sundials',
    bgInner: '#102247',
    bgMid: '#09142b',
    bgOuter: '#050a17',
    ringPrimary: '#ebb14d',
    ringSecondary: '#36e8ff',
    nebulaGlow: 'rgba(54, 232, 255, 0.14)',
    accentGlow: 'rgba(235, 177, 77, 0.18)',
    prismColor: '#48f5ff',
    prismCount: 3,
    prismOrbitRadius: 195,
  },
  {
    id: 'nebula-foundry',
    actLabel: 'ACT II',
    name: 'VIOLET ORRERY',
    subtitle: 'Bifurcated Mirrors & Paradox Conduits',
    bgInner: '#261247',
    bgMid: '#140a29',
    bgOuter: '#080414',
    ringPrimary: '#ff61b6',
    ringSecondary: '#3df5d4',
    nebulaGlow: 'rgba(255, 97, 182, 0.16)',
    accentGlow: 'rgba(61, 245, 212, 0.14)',
    prismColor: '#ff7ee2',
    prismCount: 4,
    prismOrbitRadius: 210,
  },
  {
    id: 'eclipse-sanctum',
    actLabel: 'ACT III',
    name: 'ECLIPSE SANCTUM',
    subtitle: 'Sundered Corona & Sovereign Core',
    bgInner: '#43162b',
    bgMid: '#240a19',
    bgOuter: '#0b0308',
    ringPrimary: '#ff4769',
    ringSecondary: '#ffcb47',
    nebulaGlow: 'rgba(255, 71, 105, 0.18)',
    accentGlow: 'rgba(255, 203, 71, 0.16)',
    prismColor: '#ffd257',
    prismCount: 4,
    prismOrbitRadius: 218,
  },
];

export const WAVE_SCHEDULE = [
  { wave: 1, realmIndex: 0, title: 'Astrolabe Awakening', budget: 12, types: ['drifter', 'sniper'], bossId: null },
  { wave: 2, realmIndex: 0, title: 'Pendulum Crosswind', budget: 17, types: ['drifter', 'lancer', 'sniper'], bossId: null },
  { wave: 3, realmIndex: 0, title: 'Guardian of the Sundial', budget: 6, types: ['drifter', 'sniper'], bossId: 'helios-centurion' },
  { wave: 4, realmIndex: 1, title: 'Refractive Bifurcation', budget: 21, types: ['drifter', 'splitter', 'sniper'], bossId: null },
  { wave: 5, realmIndex: 1, title: 'Phalanx of the Orrery', budget: 26, types: ['lancer', 'warden', 'splitter', 'sniper'], bossId: null },
  { wave: 6, realmIndex: 1, title: 'Loom of Paradox', budget: 8, types: ['splitter', 'warden'], bossId: 'paradox-weaver' },
  { wave: 7, realmIndex: 2, title: 'Corona Convergence', budget: 30, types: ['lancer', 'warden', 'obelisk', 'splitter'], bossId: null },
  { wave: 8, realmIndex: 2, title: 'Sundered Armada', budget: 36, types: ['drifter', 'lancer', 'warden', 'obelisk', 'sniper'], bossId: null },
  { wave: 9, realmIndex: 2, title: 'Throne of the Eclipse', budget: 10, types: ['warden', 'obelisk'], bossId: 'kronos-sundered' },
];

export function realmForWave(waveNumber) {
  const clamped = Math.max(1, waveNumber);
  if (clamped <= 3) return REALM_THEMES[0];
  if (clamped <= 6) return REALM_THEMES[1];
  if (clamped <= 9) return REALM_THEMES[2];
  return REALM_THEMES[(clamped - 1) % REALM_THEMES.length];
}
