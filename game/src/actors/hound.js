// A hound is the meadow's opinion of a fox with too much light. It prowls, it
// picks out the dimmest wisp or the fox itself, it crouches so the player can see
// the bite coming, and then it lunges. A flare is the one thing it respects.

import { TAU, clamp } from '../engine/draw.js';
import { STAGE, keepInField } from '../render/layout.js';

export const HOUND_TYPES = {
  stalker: {
    label: 'Duskhound',
    radius: 28,
    prowlSpeed: 68,
    chaseSpeed: 176,
    lungeSpeed: 600,
    crouchTime: 0.62,
    recoverTime: 1.05,
    sense: 360,
    accel: 900,
  },
  brute: {
    label: 'Brambleback',
    radius: 42,
    prowlSpeed: 50,
    chaseSpeed: 132,
    lungeSpeed: 500,
    crouchTime: 0.7,
    recoverTime: 1.2,
    sense: 330,
    accel: 640,
  },
};

export class Hound {
  constructor(x, y, type = 'stalker', rng) {
    this.type = type;
    this.spec = HOUND_TYPES[type] ?? HOUND_TYPES.stalker;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = this.spec.radius;
    this.state = 'prowl';
    this.stateT = 0;
    this.fleeT = 0;
    this.target = null;
    this.sated = 0;
    this.mode = 'wisp';
    this.lungeDir = { x: 1, y: 0 };
    this.wander = rng ? { x: rng.range(120, 1100), y: rng.range(420, 720) } : { x: 640, y: 560 };
    this.rng = rng;
    this.bob = rng ? rng.range(0, TAU) : 0;
    this.facing = -1;
    this.eyeGlow = 0;
    this.smokeT = 0;
  }

  get crouching() {
    return this.state === 'crouch';
  }

  get lunging() {
    return this.state === 'lunge';
  }

  /** The hound's next bite is telegraphed: crouch, then lunge. */
  setState(state, hold = null) {
    this.state = state;
    this.stateT = 0;
    this.hold = hold ?? this.spec.recoverTime;
  }

  update(dt, world) {
    const { fox, flock, light, hollow, tuning, rng, events } = world;
    const spec = this.spec;
    this.stateT += dt;
    this.bob += dt * 3;
    this.fleeT = Math.max(0, this.fleeT - dt);
    this.sated = Math.max(0, this.sated - dt);
    this.eyeGlow = this.state === 'crouch' ? 1 : this.state === 'lunge' ? 0.9 : 0.45;

    // A flare close enough to hurt sends it running, brute or not.
    const fear = light ? light.inFlare(this.x, this.y) : 0;
    if (fear > 0.05 && this.fleeT <= 0) {
      this.fleeT = tuning.flareFear * (this.type === 'brute' ? 0.7 : 1) * (0.5 + fear * 0.5);
      this.setState('flee');
    }

    let desired = { x: 0, y: 0 };
    let accel = spec.accel;

    if (this.fleeT > 0 || this.state === 'flee') {
      const dx = this.x - light.origin.x;
      const dy = this.y - light.origin.y;
      const len = Math.hypot(dx, dy) || 1;
      desired = { x: (dx / len) * 340, y: (dy / len) * 340 };
      if (this.fleeT <= 0) this.setState('prowl');
    } else if (this.state === 'crouch') {
      desired = { x: 0, y: 0 };
      if (this.stateT >= spec.crouchTime) {
        const aim = this.target ?? fox;
        const dx = aim.x - this.x;
        const dy = aim.y - this.y;
        const len = Math.hypot(dx, dy) || 1;
        this.lungeDir = { x: dx / len, y: dy / len };
        this.setState('lunge');
      }
    } else if (this.state === 'lunge') {
      desired = { x: this.lungeDir.x * spec.lungeSpeed, y: this.lungeDir.y * spec.lungeSpeed };
      accel = spec.accel * 4;
      if (this.stateT > 0.26) this.setState('recover');
    } else if (this.state === 'recover') {
      desired = { x: this.vx * 0.4, y: this.vy * 0.4 };
      if (this.stateT > (this.hold ?? spec.recoverTime)) this.setState('prowl');
    } else {
      const prey = this.choosePrey(fox, flock, tuning);
      this.target = prey.point;
      this.mode = prey.mode;
      const dx = prey.point.x - this.x;
      const dy = prey.point.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = prey.mode === 'fox' ? spec.chaseSpeed * 1.06 : spec.chaseSpeed;
      desired = { x: (dx / dist) * speed, y: (dy / dist) * speed };
      if (dist < spec.radius + 118 && prey.mode !== 'prowl') this.setState('crouch');
      this.state = prey.mode === 'prowl' ? 'prowl' : 'stalk';
    }

    // Steer toward the desired velocity, then move.
    const dvx = desired.x - this.vx;
    const dvy = desired.y - this.vy;
    const dlen = Math.hypot(dvx, dvy);
    const maxStep = accel * dt;
    if (dlen > maxStep && dlen > 0) {
      this.vx += (dvx / dlen) * maxStep;
      this.vy += (dvy / dlen) * maxStep;
    } else {
      this.vx = desired.x;
      this.vy = desired.y;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // The meadow's edges and the Hollow's threshold are both walls to a hound.
    const held = keepInField(this.x, this.y, this.radius);
    this.x = held.x;
    this.y = held.y;
    if (hollow) {
      const dx = this.x - hollow.x;
      const dy = this.y - hollow.y;
      const dist = Math.hypot(dx, dy) || 1;
      const wall = hollow.radius + this.radius + 26;
      if (dist < wall) {
        this.x = hollow.x + (dx / dist) * wall;
        this.y = hollow.y + (dy / dist) * wall;
      }
    }
    if (Math.abs(this.vx) > 8) this.facing = this.vx > 0 ? 1 : -1;

    // What the hound runs into is the hound's business.
    if (this.state !== 'recover' && this.state !== 'flee') {
      if (!fox.invulnerable) {
        const d = Math.hypot(fox.x - this.x, fox.y - this.y);
        if (d < this.radius + fox.radius - 2 && (this.state === 'lunge' || this.mode === 'fox')) {
          if (events.onFoxBite) events.onFoxBite(this);
          // A hound that has bitten is full for a while: it backs off instead of
          // pressing, which is what gives the fox a breath to escape on.
          const away = Math.atan2(this.y - fox.y, this.x - fox.x);
          this.vx = Math.cos(away) * 300;
          this.vy = Math.sin(away) * 300;
          this.sated = 2.6;
          this.setState('recover', 1.15);
        }
      }
      const caught = flock?.nearest(this.x, this.y, this.radius + 16);
      if (caught && this.state !== 'crouch') {
        caught.panic(2.1, this.x, this.y);
        if (events.onScatter) events.onScatter(caught, this);
        this.setState('recover');
      }
    }

    this.smokeT += dt;
    return this;
  }

  /** The fox if it is close, else the wisp nearest to the hound and furthest from home. */
  choosePrey(fox, flock, tuning) {
    const sense = this.spec.sense * tuning.houndSense;
    const foxDist = Math.hypot(fox.x - this.x, fox.y - this.y);
    const foxIsPrey = this.sated <= 0 && foxDist < 172 * tuning.houndSense;
    const wisp = flock?.nearest(this.x, this.y, sense) ?? null;
    if (wisp && !foxIsPrey) return { point: { x: wisp.x + wisp.vx * 0.18, y: wisp.y + wisp.vy * 0.18 }, mode: 'wisp' };
    if (foxIsPrey) return { point: { x: fox.x + fox.vx * 0.12, y: fox.y + fox.vy * 0.12 }, mode: 'fox' };
    const toWander = Math.hypot(this.wander.x - this.x, this.wander.y - this.y);
    if (toWander < 40 && this.rng) {
      this.wander = { x: this.rng.range(STAGE.fieldLeft + 60, STAGE.fieldRight - 60), y: this.rng.range(STAGE.fieldTop + 40, STAGE.fieldBottom - 40) };
    }
    return { point: this.wander, mode: 'prowl' };
  }

  /** How far into a lunge it is, for the renderer. */
  get lungeProgress() {
    return clamp(this.stateT / Math.max(0.01, this.spec.crouchTime), 0, 1);
  }
}
