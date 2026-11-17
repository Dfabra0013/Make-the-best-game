// Bootstrap, fixed-step simulation orchestration, mode transitions, rendering and lifecycle wiring.

import { ARENA_CENTER_X, ARENA_CENTER_Y, GAME_CONFIG, realmForWave } from './config.js';
import {
  advanceWaveOrVictory,
  announceBanner,
  createInitialGameState,
  persistBestScore,
  startExpedition,
} from './state.js';
import { createInputController, endInputFrame, pickUiButton, samplePlayerCommands } from './input.js';
import { updatePlayerShip } from './player.js';
import { recordPlayerTimelineFrame, summonTemporalEcho, updateTemporalEchoes } from './echo.js';
import { createEnemy, spawnWaveEncounter, updateEnemySquadrons } from './enemies.js';
import {
  buildRealmPrisms,
  collectChronoShards,
  resolveArenaCollisions,
  spawnFloatingCallout,
  updateProjectilesAndPrisms,
} from './combat.js';
import { computeRelicModifiers, RELIC_CATALOG, rollRelicDraftChoices } from './relics.js';
import { emitBurstParticles, emitShockwaveRing, updateVisualEffects } from './particles.js';
import { renderArenaWorld } from './render.js';
import { renderBossHealthBar, renderGameplayHud, renderWaveBanner } from './hud.js';
import {
  handleUiAction,
  renderPauseOverlay,
  renderRelicDraftOverlay,
  renderRunSummaryScreen,
  renderTitleAndLoadoutScreen,
  resolveKeyboardUi,
} from './screens.js';
import {
  createSoundEngine,
  ensureAudioStarted,
  playDefeatSwell,
  playRelicDraftChime,
  playUiClick,
  playVictoryFanfare,
  setMusicActive,
  toggleSoundEnabled,
  updateAdaptiveMusic,
} from './audio.js';
import { clamp } from './mathutil.js';

const UI_KEYS = ['enter', 'escape', 'p', '1', '2', '3', 'm'];

export function startChronodialGame(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const state = createInitialGameState(0x7c91e3b5);
  state.audio = createSoundEngine();
  const input = createInputController(canvas);
  const game = { canvas, ctx, input, state, accumulator: 0, lastTime: 0, cursorIsUi: false };

  startExpedition(state, state.selectedChassisIndex);
  state.mode = 'title';
  state.enemies = [];
  state.projectiles = [];
  state.shards = [];
  buildRealmPrisms(state);
  state.player.x = ARENA_CENTER_X;
  state.player.y = ARENA_CENTER_Y + 60;

  bindWindowLifecycle(state, game);
  exposeDebugHooks(state, game);

  let frameHandle = 0;
  const loop = (now) => {
    const delta = game.lastTime === 0 ? GAME_CONFIG.fixedStepSec : (now - game.lastTime) / 1000;
    game.lastTime = now;
    game.accumulator += Math.min(GAME_CONFIG.maxFrameDeltaSec, Math.max(0, delta));

    let steps = 0;
    while (game.accumulator >= GAME_CONFIG.fixedStepSec && steps < 5) {
      stepSimulationFrame(state, GAME_CONFIG.fixedStepSec, input, game);
      game.accumulator -= GAME_CONFIG.fixedStepSec;
      steps += 1;
    }
    renderGameFrame(ctx, state, game);
    if (steps > 0) endInputFrame(input);
    frameHandle = window.requestAnimationFrame(loop);
  };
  frameHandle = window.requestAnimationFrame(loop);
  game.stop = () => window.cancelAnimationFrame(frameHandle);
  window.__chronodial = game;
  return game;
}

function consumeUiKey(input, key) {
  if (!input.pressed.has(key)) return false;
  input.pressed.delete(key);
  return true;
}

function processUiKeys(state, input, game) {
  const summaryMode = state.mode === 'title' || state.mode === 'victory' || state.mode === 'gameover';
  if (summaryMode && consumeUiKey(input, ' ')) {
    dispatchAction(state, state.mode === 'title' ? 'start' : 'play-again', game);
  }
  for (const key of UI_KEYS) {
    if (!consumeUiKey(input, key)) continue;
    if (key === 'm') {
      toggleSoundEnabled(state.audio, !state.audio.enabled);
      playUiClick(state.audio);
      continue;
    }
    if (key === 'escape' || key === 'p') {
      if (state.mode === 'playing') {
        state.mode = 'paused';
        continue;
      }
      if (state.mode === 'paused') {
        state.mode = 'playing';
        continue;
      }
    }
    const action = resolveKeyboardUi(state, key);
    if (action) {
      dispatchAction(state, action, game);
    }
  }
}

function processUiClicks(state, input, game) {
  if (input.clicks.length === 0) return;
  const clicks = input.clicks.slice();
  input.clicks.length = 0;
  for (const click of clicks) {
    if (!state.audio.context) {
      ensureAudioStarted(state.audio);
      setMusicActive(state.audio, true);
    }
    const button = pickUiButton(state, click.x, click.y);
    if (!button) continue;
    playUiClick(state.audio);
    dispatchAction(state, button.id, game);
  }
}

function dispatchAction(state, action, game) {
  if (handleUiAction(state, action)) return;
  void game;
}

function resolvePendingAction(state, game) {
  const action = state.pendingAction;
  if (!action) return;
  state.pendingAction = null;

  if (action === 'start-run' || action === 'restart-run') {
    launchExpedition(state);
  } else if (action === 'next-wave') {
    const result = advanceWaveOrVictory(state);
    if (result.finished) {
      state.mode = 'victory';
      state.summaryTimer = 0;
      persistBestScore(state.score);
      playVictoryFanfare(state.audio);
    } else {
      startWave(state);
    }
  } else if (action === 'to-title') {
    returnToTitle(state);
  } else if (action === 'endless') {
    state.endlessMode = true;
    state.wave += 1;
    state.realm = realmForWave(state.wave);
    state.mode = 'playing';
    state.summaryTimer = 0;
    state.player.hull = Math.min(state.player.maxHull, state.player.hull + state.player.maxHull * 0.45);
    state.player.shield = state.player.maxShield;
    startWave(state);
  }
  void game;
}

function launchExpedition(state) {
  startExpedition(state, state.selectedChassisIndex);
  if (!state.audio.context) {
    ensureAudioStarted(state.audio);
  }
  setMusicActive(state.audio, true);
  startWave(state);
}

function startWave(state) {
  state.mode = 'playing';
  state.projectiles = [];
  spawnWaveEncounter(state);
  buildRealmPrisms(state);
  state.currentModifiers = computeRelicModifiers(state);
  state.player.shield = state.player.maxShield;
  state.player.hull = Math.min(state.player.maxHull, state.player.hull + state.player.maxHull * 0.12);
}

function returnToTitle(state) {
  state.mode = 'title';
  state.enemies = [];
  state.projectiles = [];
  state.shards = [];
  state.echoes = [];
  state.banner.timerSec = 0;
  state.spawnQueue = [];
  state.waveClearTimer = 0;
  state.relicDraftChoices = [];
  buildRealmPrisms(state);
  state.player.x = ARENA_CENTER_X;
  state.player.y = ARENA_CENTER_Y + 60;
  setMusicActive(state.audio, true);
}

function updateTitleAmbience(state, dt) {
  state.titleClock += dt;
  if (state.enemies.length < 8 && state.rng() < dt * 0.9) {
    const types = ['drifter', 'sniper', 'splitter', 'lancer'];
    const type = types[Math.floor(state.rng() * types.length)];
    const enemy = createEnemy(state, type, { x: ARENA_CENTER_X, y: ARENA_CENTER_Y });
    enemy.fireInterval = 0;
    enemy.contactDamage = 0;
    enemy.spawnGraceSec = 0;
    enemy.orbitAngle = state.rng() * Math.PI * 2;
    enemy.orbitRadius = 238 + state.rng() * 74;
    enemy.orbitSpeed = (0.12 + state.rng() * 0.24) * enemy.orbitDir;
    enemy.orbitWobble = state.rng() * Math.PI * 2;
    state.enemies.push(enemy);
  }

  for (const enemy of state.enemies) {
    enemy.orbitAngle += enemy.orbitSpeed * dt;
    enemy.orbitWobble += dt * 1.4;
    const radius = enemy.orbitRadius + Math.sin(enemy.orbitWobble) * 18;
    enemy.x = ARENA_CENTER_X + Math.cos(enemy.orbitAngle) * radius;
    enemy.y = ARENA_CENTER_Y + Math.sin(enemy.orbitAngle * 0.82) * radius * 0.76;
  }

  const player = state.player;
  player.aimAngle = -Math.PI / 2 + Math.sin(state.titleClock * 0.7) * 0.5;
  player.x = ARENA_CENTER_X + Math.cos(state.titleClock * 0.45) * 26;
  player.y = ARENA_CENTER_Y + 62 + Math.sin(state.titleClock * 0.8) * 12;
  if (state.rng() < dt * 6) {
    emitBurstParticles(state, player.x - 18, player.y, {
      count: 1,
      colors: [player.chassis.accentColor, '#9ff3ff'],
      speedMin: 10,
      speedMax: 40,
      lifeMin: 0.2,
      lifeMax: 0.5,
      sizeMin: 1,
      sizeMax: 2.2,
      angle: Math.PI,
      spread: 0.5,
    });
  }
}

function openRelicDraft(state) {
  state.relicDraftChoices = rollRelicDraftChoices(state, 3);
  state.mode = 'relic-draft';
  playRelicDraftChime(state.audio);
  if (state.relicDraftChoices.length === 0) {
    state.pendingAction = 'next-wave';
  }
}

function handlePlayerDeath(state) {
  state.mode = 'gameover';
  state.summaryTimer = 0;
  persistBestScore(state.score);
  state.shakeTrauma = 1;
  state.hitStopSec = 0.3;
  const player = state.player;
  for (let i = 0; i < 3; i++) {
    emitShockwaveRing(state, player.x, player.y, {
      radiusEnd: 120 + i * 90,
      color: i % 2 === 0 ? '#ff7a7a' : '#ffd166',
      life: 0.6 + i * 0.14,
      width: 4 - i,
    });
  }
  emitBurstParticles(state, player.x, player.y, {
    count: 60,
    colors: ['#ff8a7a', '#ffd166', '#ffffff'],
    speedMin: 80,
    speedMax: 420,
    lifeMin: 0.3,
    lifeMax: 1,
    sizeMin: 1.4,
    sizeMax: 5,
  });
  playDefeatSwell(state.audio);
}

export function stepSimulationFrame(state, dt, input, game) {
  state.timeSec += dt;

  processUiKeys(state, input, game);
  processUiClicks(state, input, game);
  resolvePendingAction(state, game);

  const mode = state.mode;

  if (mode === 'title') {
    updateTitleAmbience(state, dt);
    updateVisualEffects(state, dt);
    state.currentModifiers = computeRelicModifiers(state);
    updateAdaptiveMusic(state.audio, state, dt);
    return;
  }

  if (mode === 'playing') {
    state.runTimeSec += dt;
    const modifiers = computeRelicModifiers(state);
    state.currentModifiers = modifiers;

    const commands = samplePlayerCommands(input, state);
    updatePlayerShip(state, commands, dt, modifiers);
    recordPlayerTimelineFrame(state);
    updateTemporalEchoes(state, dt, modifiers);
    updateEnemySquadrons(state, dt);
    updateProjectilesAndPrisms(state, dt, modifiers);
    resolveArenaCollisions(state, dt, modifiers);
    collectChronoShards(state, dt, modifiers);
    updateVisualEffects(state, dt);
    updateAdaptiveMusic(state.audio, state, dt);

    if (state.player.hull <= 0) {
      handlePlayerDeath(state);
      return;
    }

    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      if (state.waveClearTimer <= 0) {
        state.waveClearTimer = 1.8;
        const bonus = 400 + state.wave * 120;
        state.score += Math.round(bonus * state.combo);
        spawnFloatingCallout(state, ARENA_CENTER_X, ARENA_CENTER_Y - 60, `WAVE BONUS +${Math.round(bonus * state.combo)}`, '#ffe9a8', 22);
        announceBanner(
          state,
          'WAVE CLEARED',
          `BONUS +${Math.round(bonus * state.combo)} · CHOOSE A CHRONO-RELIC`,
          '#7cffb2',
          2.2,
        );
      } else {
        state.waveClearTimer -= dt;
        if (state.waveClearTimer <= 0) {
          state.waveClearTimer = 0;
          if (!state.endlessMode && state.wave >= GAME_CONFIG.campaignTotalWaves) {
            state.mode = 'victory';
            state.summaryTimer = 0;
            persistBestScore(state.score);
            playVictoryFanfare(state.audio);
          } else {
            openRelicDraft(state);
          }
        }
      }
    }
    return;
  }

  if (mode === 'relic-draft' || mode === 'paused') {
    updateVisualEffects(state, dt);
    updateAdaptiveMusic(state.audio, state, dt);
    return;
  }

  if (mode === 'victory' || mode === 'gameover') {
    state.summaryTimer += dt;
    updateVisualEffects(state, dt);
    updateAdaptiveMusic(state.audio, state, dt);
  }
}

function drawAimReticle(ctx, state, input) {
  if (!input.pointerInside) return;
  const player = state.player;
  const x = input.mouseX;
  const y = input.mouseY;
  const pulse = 0.75 + 0.25 * Math.sin(state.timeSec * 6);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = player.chassis.accentColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x - 7, y);
  ctx.moveTo(x + 7, y);
  ctx.lineTo(x + 18, y);
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y - 7);
  ctx.moveTo(x, y + 7);
  ctx.lineTo(x, y + 18);
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = player.chassis.primaryColor;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

export function renderGameFrame(ctx, state, game) {
  const input = game.input;
  const hover = pickUiButton(state, input.mouseX, input.mouseY);
  const hoverId = hover ? hover.id : null;
  if (state.hoveredButtonId !== hoverId) {
    state.hoveredButtonId = hoverId;
  }
  const wantsUiCursor = Boolean(hover);
  if (wantsUiCursor !== game.cursorIsUi) {
    game.cursorIsUi = wantsUiCursor;
    if (wantsUiCursor) game.canvas.classList.add('ui-cursor');
    else game.canvas.classList.remove('ui-cursor');
  }

  state.uiButtons = [];
  renderArenaWorld(ctx, state, state.timeSec);

  if (state.mode === 'playing' || state.mode === 'paused') {
    drawAimReticle(ctx, state, input);
    renderGameplayHud(ctx, state, state.timeSec);
    renderBossHealthBar(ctx, state, state.timeSec);
    renderWaveBanner(ctx, state, state.timeSec);
    if (state.mode === 'paused') renderPauseOverlay(ctx, state, state.timeSec);
  } else if (state.mode === 'title') {
    renderTitleAndLoadoutScreen(ctx, state, state.timeSec);
  } else if (state.mode === 'relic-draft') {
    renderGameplayHud(ctx, state, state.timeSec);
    renderWaveBanner(ctx, state, state.timeSec);
    renderRelicDraftOverlay(ctx, state, state.timeSec);
  } else if (state.mode === 'victory' || state.mode === 'gameover') {
    renderRunSummaryScreen(ctx, state, state.timeSec);
  }
}

export function bindWindowLifecycle(state, game) {
  const ensureAudio = () => {
    if (!state.audio) return;
    const context = ensureAudioStarted(state.audio);
    if (context) setMusicActive(state.audio, true);
  };
  window.addEventListener('pointerdown', ensureAudio, { passive: true });
  window.addEventListener('keydown', ensureAudio);
  window.addEventListener('blur', () => {
    if (state.mode === 'playing') state.mode = 'paused';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') state.mode = 'paused';
  });
  window.addEventListener('beforeunload', () => {
    if (state.score > state.bestScore) persistBestScore(state.score);
  });
  void game;
}

function exposeDebugHooks(state, game) {
  const mods = () => computeRelicModifiers(state);
  window.ChronodialDebug = {
    state,
    start(chassisIndex = 0) {
      state.selectedChassisIndex = clamp(chassisIndex, 0, 2);
      launchExpedition(state);
      return state;
    },
    setWave(wave) {
      state.wave = Math.max(1, Math.floor(wave));
      state.enemies = [];
      state.echoes = [];
      state.shards = [];
      state.mode = 'playing';
      startWave(state);
      return state.wave;
    },
    spawnEcho(count = 1) {
      for (let i = 0; i < count; i++) {
        state.player.echoCharge = 100;
        summonTemporalEcho(state, mods());
      }
      return state.echoes.length;
    },
    grantRelics(ids) {
      state.relics = RELIC_CATALOG.filter((relic) => ids.includes(relic.id));
      const bonus = mods();
      state.player.maxHull = state.player.chassis.maxHull + bonus.maxHullBonus;
      state.player.maxShield = state.player.chassis.maxShield + bonus.maxShieldBonus;
      state.player.hull = state.player.maxHull;
      state.player.shield = state.player.maxShield;
      return state.relics.map((relic) => relic.id);
    },
    spawnAt(type, x, y) {
      const enemy = createEnemy(state, type, { x, y });
      enemy.spawnGraceSec = 0;
      enemy.fireTimer = 0.4 + state.rng() * 0.8;
      state.enemies.push(enemy);
      return enemy.id;
    },
    placePlayer(x, y) {
      state.player.x = x;
      state.player.y = y;
      state.player.vx = 0;
      state.player.vy = 0;
      state.timelineHead = 0;
      state.timelineBuffer.forEach((frame) => {
        frame.x = x;
        frame.y = y;
      });
    },
    win() {
      state.mode = 'victory';
      state.summaryTimer = 0;
      persistBestScore(state.score);
      return state.mode;
    },
  };
  void game;
}

if (typeof document !== 'undefined') {
  const boot = () => {
    const canvas = document.getElementById('game-canvas');
    if (canvas) startChronodialGame(canvas);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
