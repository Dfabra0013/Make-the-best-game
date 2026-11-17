// Every sound in Wispwood is generated here, in the browser, from oscillators
// and filtered noise: no audio files, no network, and the same calls run silent
// under the render tools. The palette is a music box in a wood: bells for a wisp
// going home, a low thud for a hound, a breath of noise for the flare.

const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5 };

/** The chime a delivery rings, walking up a pentatonic scale with the combo. */
const COMBO_SCALE = [NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.A5, NOTES.C6];

export class SoundBoard {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambience = null;
  }

  /** Opens the audio device; browsers only allow it after a gesture. */
  unlock() {
    if (this.ctx !== null) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (typeof Ctor !== 'function') return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
  }

  get ready() {
    return this.ctx !== null && !this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }

  /** A bell: two partials, a fast bloom and a long tail. */
  bell(freq, opts = {}) {
    const { gain = 0.22, duration = 1.1, detune = 0, type = 'triangle' } = opts;
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    out.connect(this.master);
    for (const [mult, level] of [[1, 1], [2.01, 0.35], [3.02, 0.12]]) {
      const osc = this.ctx.createOscillator();
      const partial = this.ctx.createGain();
      partial.gain.value = level;
      osc.type = type;
      osc.frequency.value = freq * mult;
      osc.detune.value = detune;
      osc.connect(partial).connect(out);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }
  }

  /** Filtered noise with a swell: the flare, a dash, a hound's landing. */
  breath(opts = {}) {
    const { gain = 0.2, duration = 0.4, from = 900, to = 240, q = 1.2 } = opts;
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const length = Math.ceil(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), now + duration);
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(gain, now + duration * 0.25);
    out.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(out).connect(this.master);
    source.start(now);
  }

  /** A short fall: the hound's growl and the fox's hurt. */
  growl(freq = 96, duration = 0.5) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const out = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + duration);
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
    out.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter).connect(out).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /** The delivery chime, rising with the combo the player is holding. */
  delivery(combo) {
    const note = COMBO_SCALE[Math.min(COMBO_SCALE.length - 1, Math.max(0, combo - 1))];
    this.bell(note, { gain: 0.2, duration: 1.3 });
    this.bell(note * 2, { gain: 0.05, duration: 0.8, detune: 6 });
  }

  /** The soft knock of a wisp bumping into the light. */
  wispChirp() {
    this.bell(NOTES.E5, { gain: 0.05, duration: 0.4, type: 'sine' });
  }

  /** A charm taken: three notes up. */
  charm() {
    [NOTES.C5, NOTES.E5, NOTES.G5].forEach((f, i) => {
      setTimeout(() => this.bell(f, { gain: 0.16, duration: 0.9 }), i * 90);
    });
  }

  /** The dusk turning over: a low bell and a breath. */
  duskComplete() {
    this.bell(NOTES.C4, { gain: 0.24, duration: 2.2, type: 'sine' });
    this.bell(NOTES.G4, { gain: 0.14, duration: 2.6, type: 'sine' });
    this.breath({ gain: 0.1, duration: 1.6, from: 600, to: 200 });
  }

  /** Nightfall, or the fox's last heart. */
  defeat() {
    this.growl(84, 1.4);
    this.bell(NOTES.A4 * 0.5, { gain: 0.2, duration: 2.4, type: 'sine' });
  }

  /** A click on a card or a button. */
  click() {
    this.bell(NOTES.A5, { gain: 0.07, duration: 0.18, type: 'sine' });
  }

  /** A quiet bed of air under the whole game, started once per run. */
  startAmbience() {
    if (!this.ready || this.ambience) return;
    const now = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.value = 0.05;
    out.connect(this.master);
    const air = this.ctx.createOscillator();
    air.type = 'sine';
    air.frequency.value = 138.6;
    const shimmer = this.ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 207.7;
    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.35;
    air.connect(out);
    shimmer.connect(shimmerGain).connect(out);
    air.start(now);
    shimmer.start(now);
    this.ambience = { air, shimmer, out };
  }
}

/** One board for the whole page. */
export const sounds = new SoundBoard();
