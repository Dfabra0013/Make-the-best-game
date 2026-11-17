// Fully procedural Web Audio sound engine: weapon timbres, echo chords, boss alarms, adaptive score.

import { clamp } from './mathutil.js';

const PENTATONIC = [0, 3, 5, 7, 10];
const REALM_ROOTS = [110, 98, 82.41];

export function createSoundEngine() {
  return {
    context: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    noiseBuffer: null,
    enabled: true,
    music: {
      nextStepTime: 0,
      step: 0,
      intensity: 0,
      realmIndex: 0,
      active: false,
    },
  };
}

export function ensureAudioStarted(engine) {
  if (!engine) return null;
  if (engine.context) {
    if (engine.context.state === 'suspended') {
      engine.context.resume().catch(() => {});
    }
    return engine.context;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    const context = new AudioCtor();
    const master = context.createGain();
    master.gain.value = 0.9;
    master.connect(context.destination);

    const musicGain = context.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);

    const sfxGain = context.createGain();
    sfxGain.gain.value = 0.85;
    sfxGain.connect(master);

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.7, context.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
    }

    engine.context = context;
    engine.master = master;
    engine.musicGain = musicGain;
    engine.sfxGain = sfxGain;
    engine.noiseBuffer = noiseBuffer;
    engine.music.nextStepTime = context.currentTime + 0.1;
    return context;
  } catch {
    return null;
  }
}

function tone(engine, spec) {
  const context = engine.context;
  if (!context || !engine.enabled) return;
  const now = context.currentTime + (spec.delay ?? 0);
  const duration = spec.duration ?? 0.16;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = spec.type ?? 'triangle';
  osc.frequency.setValueAtTime(spec.freq, now);
  if (spec.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, spec.sweepTo), now + duration);
  }
  const peak = Math.max(0.0001, spec.gain ?? 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + Math.min(0.02, duration * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(spec.destination ?? engine.sfxGain);
  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function noiseHit(engine, spec) {
  const context = engine.context;
  if (!context || !engine.enabled || !engine.noiseBuffer) return;
  const now = context.currentTime + (spec.delay ?? 0);
  const source = context.createBufferSource();
  source.buffer = engine.noiseBuffer;
  const filter = context.createBiquadFilter();
  filter.type = spec.filterType ?? 'bandpass';
  filter.frequency.setValueAtTime(spec.freq ?? 1400, now);
  if (spec.sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(60, spec.sweepTo), now + (spec.duration ?? 0.2));
  filter.Q.value = spec.q ?? 1.1;
  const gain = context.createGain();
  gain.gain.setValueAtTime(spec.gain ?? 0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (spec.duration ?? 0.2));
  source.connect(filter);
  filter.connect(gain);
  gain.connect(spec.destination ?? engine.sfxGain);
  source.start(now);
  source.stop(now + (spec.duration ?? 0.2) + 0.02);
}

export function playWeaponSynth(engine, chassisId, variant = 0) {
  if (!engine?.context || !engine.enabled) return;
  if (chassisId === 'solar-lance') {
    tone(engine, { freq: 1180 + variant * 60, sweepTo: 420, type: 'sawtooth', duration: 0.09, gain: 0.055 });
    noiseHit(engine, { freq: 2600, sweepTo: 700, duration: 0.07, gain: 0.035 });
  } else if (chassisId === 'astraea-prism') {
    tone(engine, { freq: 880 + variant * 40, sweepTo: 1320, type: 'sine', duration: 0.14, gain: 0.05 });
    tone(engine, { freq: 1320, sweepTo: 660, type: 'triangle', duration: 0.1, gain: 0.03, delay: 0.01 });
  } else {
    tone(engine, { freq: 220, sweepTo: 92, type: 'square', duration: 0.18, gain: 0.06 });
    noiseHit(engine, { freq: 900, sweepTo: 160, duration: 0.2, gain: 0.06, filterType: 'lowpass' });
  }
}

export function playEchoChord(engine) {
  if (!engine?.context || !engine.enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, index) => {
    tone(engine, { freq, type: 'sine', duration: 0.62 - index * 0.07, gain: 0.045, delay: index * 0.045 });
  });
  noiseHit(engine, { freq: 3200, sweepTo: 900, duration: 0.28, gain: 0.04, q: 2.4 });
}

export function playBossAlarm(engine) {
  if (!engine?.context || !engine.enabled) return;
  for (let i = 0; i < 2; i++) {
    tone(engine, { freq: 164.81, type: 'sawtooth', duration: 0.38, gain: 0.075, delay: i * 0.34, sweepTo: 110 });
    tone(engine, { freq: 246.94, type: 'square', duration: 0.3, gain: 0.04, delay: i * 0.34 + 0.1 });
  }
}

export function playImpactSynth(engine, kind = 'enemy') {
  if (!engine?.context || !engine.enabled) return;
  if (kind === 'player-hurt') {
    tone(engine, { freq: 320, sweepTo: 62, type: 'sawtooth', duration: 0.34, gain: 0.11 });
    noiseHit(engine, { freq: 700, sweepTo: 120, duration: 0.32, gain: 0.09, filterType: 'lowpass' });
    return;
  }
  if (kind === 'boss-hurt') {
    tone(engine, { freq: 160, sweepTo: 70, type: 'square', duration: 0.12, gain: 0.05 });
    return;
  }
  tone(engine, { freq: 420, sweepTo: 140, type: 'triangle', duration: 0.11, gain: 0.05 });
  noiseHit(engine, { freq: 1900, sweepTo: 500, duration: 0.09, gain: 0.045 });
}

export function playShardPickup(engine, stepIndex = 0) {
  if (!engine?.context || !engine.enabled) return;
  const scale = [880, 987.77, 1174.66, 1318.51, 1567.98];
  tone(engine, { freq: scale[stepIndex % scale.length], type: 'sine', duration: 0.13, gain: 0.035 });
}

export function playDashWhoosh(engine) {
  if (!engine?.context || !engine.enabled) return;
  noiseHit(engine, { freq: 400, sweepTo: 2800, duration: 0.22, gain: 0.06, q: 0.8 });
  tone(engine, { freq: 640, sweepTo: 1240, type: 'sine', duration: 0.14, gain: 0.03 });
}

export function playRelicDraftChime(engine) {
  if (!engine?.context || !engine.enabled) return;
  [659.25, 987.77, 1318.51].forEach((freq, index) => {
    tone(engine, { freq, type: 'sine', duration: 0.5, gain: 0.04, delay: index * 0.08 });
  });
}

export function playVictoryFanfare(engine) {
  if (!engine?.context || !engine.enabled) return;
  const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  melody.forEach((freq, index) => {
    tone(engine, { freq, type: 'triangle', duration: 0.6, gain: 0.06, delay: index * 0.14 });
  });
  noiseHit(engine, { freq: 5200, sweepTo: 1200, duration: 0.9, gain: 0.03, q: 1.8 });
}

export function playDefeatSwell(engine) {
  if (!engine?.context || !engine.enabled) return;
  [392, 329.63, 261.63, 196].forEach((freq, index) => {
    tone(engine, { freq, type: 'sine', duration: 0.85, gain: 0.055, delay: index * 0.16 });
  });
}

export function playUiClick(engine) {
  if (!engine?.context || !engine.enabled) return;
  tone(engine, { freq: 1480, sweepTo: 880, type: 'sine', duration: 0.07, gain: 0.045 });
}

function scheduleMusicStep(engine, realmIndex, intensity) {
  const music = engine.music;
  const step = music.step;
  const root = REALM_ROOTS[realmIndex % REALM_ROOTS.length];
  const destination = engine.musicGain;

  if (step % 8 === 0) {
    tone(engine, { freq: root / 2, type: 'sine', duration: 0.5, gain: 0.075, destination });
    tone(engine, { freq: root, type: 'triangle', duration: 0.36, gain: 0.03, destination });
  }

  if (intensity > 0.18) {
    const degree = PENTATONIC[(step * 3 + Math.floor(step / 4)) % PENTATONIC.length];
    const freq = root * 2 * Math.pow(2, degree / 12) * (step % 16 < 8 ? 1 : 2);
    tone(engine, {
      freq,
      type: 'sine',
      duration: 0.24,
      gain: 0.02 + intensity * 0.03,
      destination,
    });
  }

  if (step % 16 === 0) {
    [0, 7, 15].forEach((offset, index) => {
      tone(engine, {
        freq: root * 2 * Math.pow(2, offset / 12),
        type: 'triangle',
        duration: 1.5,
        gain: 0.022 + intensity * 0.012,
        delay: index * 0.02,
        destination,
      });
    });
  }

  if (intensity > 0.52 && step % 2 === 1) {
    noiseHit(engine, { freq: 6200, sweepTo: 3600, duration: 0.05, gain: 0.014 + intensity * 0.014, q: 3.2, destination });
  }
  if (intensity > 0.78 && step % 4 === 2) {
    tone(engine, { freq: 96, sweepTo: 62, type: 'square', duration: 0.12, gain: 0.03, destination });
  }
}

export function updateAdaptiveMusic(engine, state, dt) {
  const context = engine?.context;
  if (!context) return;
  const music = engine.music;
  const bossAlive = state.enemies.some((enemy) => enemy.isBoss);
  const stress = clamp(state.enemies.length / 16, 0, 1);
  const target = clamp(
    0.12 + stress * 0.5 + (bossAlive ? 0.35 : 0) + (state.combo > 2 ? 0.2 : 0) + (state.mode === 'playing' ? 0.12 : 0),
    0,
    1,
  );
  music.intensity += (target - music.intensity) * Math.min(1, dt * 1.6);
  music.realmIndex = indexOfRealm(state);

  if (!engine.enabled || !music.active) return;

  const stepDuration = 0.262 - music.intensity * 0.062;
  if (music.nextStepTime < context.currentTime) {
    music.nextStepTime = context.currentTime + 0.06;
  }
  let guard = 0;
  while (music.nextStepTime < context.currentTime + 0.18 && guard < 8) {
    scheduleMusicStep(engine, music.realmIndex, music.intensity);
    music.nextStepTime += stepDuration;
    music.step = (music.step + 1) % 512;
    guard++;
  }
}

function indexOfRealm(state) {
  if (!state.realm) return 0;
  if (state.wave <= 3) return 0;
  if (state.wave <= 6) return 1;
  return 2;
}

export function setMusicActive(engine, active) {
  if (!engine) return;
  engine.music.active = active;
  if (active && engine.context) {
    engine.music.nextStepTime = engine.context.currentTime + 0.08;
  }
}

export function toggleSoundEnabled(engine, enabled) {
  if (!engine) return false;
  engine.enabled = enabled;
  if (engine.master && engine.context) {
    engine.master.gain.setTargetAtTime(enabled ? 0.9 : 0.0001, engine.context.currentTime, 0.05);
  }
  return engine.enabled;
}
