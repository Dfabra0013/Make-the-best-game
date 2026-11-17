// Deterministic PRNG, expedition lifecycle, campaign progression and rank scoring.

import {
  ARENA_CENTER_X,
  ARENA_CENTER_Y,
  ARENA_HEIGHT,
  ARENA_WIDTH,
  CHASSIS_LOADOUTS,
  GAME_CONFIG,
  realmForWave,
} from './config.js';
import { clamp } from './mathutil.js';
import { createParticlePool } from './particles.js';

const BEST_SCORE_STORAGE_KEY = 'chronodial.bestScore.v1';
const DEFAULT_BEST_SCORE = 21400;

export function createSeededRandom(initialSeed = 0x51f7a9d3) {
  let state = initialSeed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readStoredBestScore() {
  try {
    const parsed = Number(window.localStorage.getItem(BEST_SCORE_STORAGE_KEY));
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_BEST_SCORE;
  } catch {
    return DEFAULT_BEST_SCORE;
  }
}

export function persistBestScore(score) {
  try {
    window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(Math.floor(score)));
  } catch {
    // Restricted storage modes simply skip persistence.
  }
}

export function buildStarfieldBackdrop(seed = 0x2491c7) {
  const rng = createSeededRandom(seed);
  const stars = [];
  for (let i = 0; i < 118; i++) {
    stars.push({
      x: rng() * ARENA_WIDTH,
      y: rng() * ARENA_HEIGHT,
      radius: 0.7 + rng() * 1.9,
      alpha: 0.22 + rng() * 0.62,
      twinkleSpeed: 1.1 + rng() * 2.6,
      phase: rng() * Math.PI * 2,
      layer: i % 3,
      warm: rng() > 0.66,
    });
  }
  return stars;
}

function buildEmptyTimeline(startX, startY) {
  const frames = [];
  for (let i = 0; i < GAME_CONFIG.echoHistoryFrames; i++) {
    frames.push({ x: startX, y: startY, aimAngle: -Math.PI / 2 });
  }
  return frames;
}

export function createFreshPlayer(chassisIndex = 0) {
  const chassis = CHASSIS_LOADOUTS[chassisIndex] ?? CHASSIS_LOADOUTS[0];
  return {
    chassisIndex,
    chassis,
    x: ARENA_CENTER_X,
    y: ARENA_CENTER_Y + 104,
    vx: 0,
    vy: 0,
    aimAngle: -Math.PI / 2,
    radius: 15,
    hull: chassis.maxHull,
    maxHull: chassis.maxHull,
    shield: chassis.maxShield,
    maxShield: chassis.maxShield,
    shieldRegenDelay: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashActiveSec: 0,
    dashDirX: 0,
    dashDirY: -1,
    invulnSec: 0,
    echoCharge: GAME_CONFIG.echoSummonCost + 25,
    overdriveCharge: 34,
    overdriveActiveSec: 0,
    muzzleFlashSec: 0,
    hitFlashSec: 0,
    grazeFlashSec: 0,
  };
}

export function createInitialGameState(seed = 0x7c91e3b5) {
  const rng = createSeededRandom(seed);
  const player = createFreshPlayer(0);
  return {
    seed,
    rng,
    mode: 'title',
    timeSec: 0,
    runTimeSec: 0,
    selectedChassisIndex: 0,
    endlessMode: false,

    wave: 1,
    realm: realmForWave(1),
    waveClearTimer: 0,
    spawnQueue: [],
    waveSpawnClock: 0,

    score: 0,
    bestScore: readStoredBestScore(),
    combo: 1,
    peakCombo: 1,
    comboTimerSec: 0,

    stats: {
      shotsFired: 0,
      shotsLanded: 0,
      enemiesDefeated: 0,
      echoesSummoned: 0,
      crossfireStrikes: 0,
      prismRicochets: 0,
      shardsCollected: 0,
      grazes: 0,
      bossesDefeated: 0,
    },

    player,
    timelineBuffer: buildEmptyTimeline(player.x, player.y),
    timelineHead: 0,
    echoes: [],
    prisms: [],
    enemies: [],
    pendingAdds: [],
    projectiles: [],
    shards: [],

    relics: [],
    relicDraftChoices: [],

    particlePool: createParticlePool(700),
    shockwaves: [],
    callouts: [],
    afterimages: [],

    banner: { title: '', subtitle: '', timerSec: 0, totalSec: 2.4, accent: '#ffbe3b' },
    hitStopSec: 0,
    shakeTrauma: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0,

    stars: buildStarfieldBackdrop(seed ^ 0x9931a),
    titleClock: 0,
    deathTimer: 0,
    summaryTimer: 0,

    uiButtons: [],
    hoveredButtonId: null,
    audio: null,
    nextEntityId: 1,
  };
}

export function clearCombatEntities(state) {
  state.echoes = [];
  state.enemies = [];
  state.pendingAdds = [];
  state.projectiles = [];
  state.shards = [];
  state.spawnQueue = [];
  state.shockwaves = [];
  state.callouts = [];
  state.afterimages = [];
  state.particlePool = createParticlePool(700);
  state.waveClearTimer = 0;
  state.hitStopSec = 0;
}

function resetRunBookkeeping(state) {
  state.timeSec = 0;
  state.runTimeSec = 0;
  state.wave = 1;
  state.realm = realmForWave(1);
  state.score = 0;
  state.combo = 1;
  state.peakCombo = 1;
  state.comboTimerSec = 0;
  state.endlessMode = false;
  state.deathTimer = 0;
  state.summaryTimer = 0;
  state.stats = {
    shotsFired: 0,
    shotsLanded: 0,
    enemiesDefeated: 0,
    echoesSummoned: 0,
    crossfireStrikes: 0,
    prismRicochets: 0,
    shardsCollected: 0,
    grazes: 0,
    bossesDefeated: 0,
  };
}

export function startExpedition(state, chassisIndex = state.selectedChassisIndex) {
  state.selectedChassisIndex = clamp(chassisIndex, 0, CHASSIS_LOADOUTS.length - 1);
  resetRunBookkeeping(state);
  state.relics = [];
  state.relicDraftChoices = [];
  state.player = createFreshPlayer(state.selectedChassisIndex);
  state.timelineBuffer = buildEmptyTimeline(state.player.x, state.player.y);
  state.timelineHead = 0;
  clearCombatEntities(state);
  state.mode = 'playing';
  announceBanner(
    state,
    `WAVE 1 / ${GAME_CONFIG.campaignTotalWaves}`,
    'Astrolabe Awakening',
    state.realm.ringPrimary,
    2.6,
  );
  return state.player;
}

export function restartCurrentRun(state) {
  startExpedition(state, state.selectedChassisIndex);
}

export function advanceWaveOrVictory(state) {
  if (!state.endlessMode && state.wave >= GAME_CONFIG.campaignTotalWaves) {
    state.mode = 'victory';
    state.summaryTimer = 0;
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      persistBestScore(state.bestScore);
    }
    return { finished: true, wave: state.wave };
  }
  state.wave += 1;
  state.realm = realmForWave(state.wave);
  state.combo = Math.max(1, Number((state.combo * 0.9).toFixed(2)));
  state.waveClearTimer = 0;
  return { finished: false, wave: state.wave };
}

export function announceBanner(state, title, subtitle, accent = '#ffbe3b', durationSec = 2.5) {
  state.banner.title = title;
  state.banner.subtitle = subtitle;
  state.banner.accent = accent;
  state.banner.timerSec = durationSec;
  state.banner.totalSec = durationSec;
}

export function awardScore(state, basePoints, modifiers) {
  const multiplier = modifiers ? modifiers.scoreMul : 1;
  const gained = Math.round(basePoints * state.combo * multiplier);
  state.score += gained;
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
  }
  return gained;
}

export function bumpCombo(state, step = GAME_CONFIG.comboStepPerKill, gainMultiplier = 1) {
  state.combo = Math.min(GAME_CONFIG.maxComboMultiplier, Number((state.combo + step * gainMultiplier).toFixed(2)));
  if (state.combo > state.peakCombo) state.peakCombo = state.combo;
  state.comboTimerSec = GAME_CONFIG.comboDecaySec;
}

export function breakCombo(state, severity = 0.5) {
  state.combo = Math.max(1, Number((state.combo * severity).toFixed(2)));
  state.comboTimerSec = GAME_CONFIG.comboDecaySec * 0.6;
}

export function rankForScore(state) {
  const tally =
    state.score +
    state.relics.length * 900 +
    state.stats.crossfireStrikes * 90 +
    state.stats.prismRicochets * 45 +
    (state.stats.bossesDefeated * 4200);

  let letter = 'D';
  let label = 'Orbit Unstable';
  let stars = 1;
  if (tally >= 62000) {
    letter = 'S+';
    label = 'Chronodial Sovereign';
    stars = 5;
  } else if (tally >= 46000) {
    letter = 'S';
    label = 'Astral Legend';
    stars = 5;
  } else if (tally >= 33000) {
    letter = 'A';
    label = 'Orbital Ace';
    stars = 4;
  } else if (tally >= 22000) {
    letter = 'B';
    label = 'Sundial Adept';
    stars = 3;
  } else if (tally >= 12000) {
    letter = 'C';
    label = 'Prism Cadet';
    stars = 2;
  }
  return { letter, label, stars, tally };
}
