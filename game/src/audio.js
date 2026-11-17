// All sound is synthesised at run time with the Web Audio API: no files, no network,
// no borrowed samples. A small pentatonic scale keeps the pickups musical.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

export function createAudio() {
  let ctx = null;
  let master = null;
  let pad = null;
  let muted = false;
  let step = 0;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    startPad();
  }

  function tone(freq, duration, type, volume, slide) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + duration + 0.02);
  }

  function noise(duration, volume, lowpass) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = lowpass;
    const gain = ctx.createGain(); gain.gain.value = volume;
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t);
  }

  function startPad() {
    if (!ctx) return;
    pad = ctx.createGain(); pad.gain.value = 0.035; pad.connect(master);
    for (const f of [65.41, 98.0, 130.81]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08 + Math.random() * 0.08;
      const lg = ctx.createGain(); lg.gain.value = 0.012;
      lfo.connect(lg); lg.connect(pad.gain);
      o.connect(pad); o.start(); lfo.start();
    }
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    playPickupChime(hueIndex) {
      const base = SCALE[(step + hueIndex) % SCALE.length];
      step = (step + 1) % SCALE.length;
      tone(base * 2, 0.16, 'sine', 0.16, base * 2.02);
      tone(base * 3, 0.10, 'triangle', 0.05);
    },
    playRefractSweep() {
      tone(180, 0.42, 'sawtooth', 0.10, 900);
      tone(540, 0.34, 'sine', 0.08, 180);
      noise(0.28, 0.05, 2200);
    },
    playHurtThud() {
      tone(120, 0.30, 'square', 0.13, 48);
      noise(0.22, 0.10, 520);
    },
    playHueRestored(index) {
      const root = SCALE[index % SCALE.length];
      [0, 0.09, 0.18, 0.30].forEach((delay, i) => {
        window.setTimeout(() => tone(root * (1 + i * 0.25), 0.34, 'sine', 0.11), delay * 1000);
      });
    },
    playVictoryArpeggio() {
      [0, 0.12, 0.24, 0.36, 0.52, 0.70].forEach((delay, i) => {
        window.setTimeout(() => tone(SCALE[i] * 2, 0.5, 'triangle', 0.13), delay * 1000);
      });
    },
    playDefeatFall() {
      tone(330, 0.7, 'sine', 0.12, 82);
      noise(0.5, 0.06, 700);
    },
  };
}
