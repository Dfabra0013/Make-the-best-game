// The lantern is the fox's only tool: a cone of warm light that pulls wisps toward
// it, and a flare that blooms out of the same wick to send hounds running. Every
// question the game asks about "is this lit?" is asked here, so the light the
// player sees and the light the flock feels cannot drift apart.

import { TAU, clamp, turnToward } from '../engine/draw.js';

export class LanternLight {
  constructor(tuning) {
    this.tuning = tuning;
    this.angle = -0.5;
    this.targetAngle = -0.5;
    this.origin = { x: 0, y: 0 };
    this.wick = tuning.wickMax;
    this.flareT = -1;
    this.flareRadius = 0;
    this.flicker = 0;
    this.chargeT = 0;
    this.spentOnFlare = false;
  }

  setTuning(tuning) {
    this.tuning = tuning;
    this.wick = Math.min(this.wick, tuning.wickMax);
  }

  get wickFraction() {
    return clamp(this.wick / this.tuning.wickMax, 0, 1);
  }

  get flaring() {
    return this.flareT >= 0;
  }

  /** Roughly how much of the wick a flare costs. */
  get flareCost() {
    return this.tuning.flareCost;
  }

  /** Points the beam at a spot on the meadow. */
  aimAt(x, y, ox, oy, dt) {
    this.origin.x = ox;
    this.origin.y = oy;
    const wanted = Math.atan2(y - oy, x - ox);
    this.targetAngle = wanted;
    this.angle = turnToward(this.angle, wanted, dt * 9.5);
  }

  /** A slight widening of the cone while the wick runs low. */
  update(dt, wantsFlare) {
    this.flicker += dt;
    this.wick = Math.min(this.tuning.wickMax, this.wick + this.tuning.wickRegen * dt);
    if (this.flareT >= 0) {
      this.flareT += dt;
      const k = clamp(this.flareT / 0.45, 0, 1);
      this.flareRadius = this.tuning.flareRadius * (0.25 + 0.75 * (1 - Math.pow(1 - k, 3)));
      if (this.flareT > 0.45) {
        this.flareT = -1;
        this.flareRadius = 0;
      }
    }
    this.chargeT = wantsFlare && this.canFlare() ? this.chargeT + dt : Math.max(0, this.chargeT - dt * 3);
  }

  canFlare() {
    return !this.flaring && this.wick >= this.flareCost;
  }

  /** Spends the wick and blooms. Returns false when the wick is too low. */
  flare() {
    if (!this.canFlare()) return false;
    this.wick = Math.max(0, this.wick - this.flareCost);
    this.flareT = 0;
    this.flareRadius = this.tuning.flareRadius * 0.3;
    this.chargeT = 0;
    return true;
  }

  /** The cone's half-angle, widened a touch as the wick burns down. */
  get coneHalf() {
    const strain = 1 - this.wickFraction;
    return this.tuning.coneHalf * (1 + strain * 0.22) * (1 + Math.sin(this.flicker * 7.3) * 0.012);
  }

  get range() {
    return this.tuning.lightRange * (1 + Math.sin(this.flicker * 3.1) * 0.015);
  }

  /** A point's angle away from the beam's centre line, in radians. */
  angleTo(x, y) {
    return Math.atan2(y - this.origin.y, x - this.origin.x);
  }

  distanceTo(x, y) {
    return Math.hypot(x - this.origin.x, y - this.origin.y);
  }

  /**
   * How strongly the beam holds a point, 0 (not lit) to 1 (bright and close).
   * The cone's edge is soft so a wisp does not snap in and out of the light.
   */
  beamStrength(x, y) {
    const dist = this.distanceTo(x, y);
    const reach = this.range;
    // Standing on a wisp lights it whatever the beam is doing: the lantern's own
    // body of light is right there.
    if (dist < 44) return 1;
    if (dist > reach) return 0;
    const off = Math.abs(this.angleTo(x, y) - this.angle);
    const spread = Math.abs(off) > Math.PI ? TAU - Math.abs(off) : Math.abs(off);
    const half = this.coneHalf;
    if (spread > half * 1.18) return 0;
    const edge = clamp(1 - (spread - half * 0.72) / (half * 0.46), 0, 1);
    const falloff = clamp(1 - dist / reach, 0, 1) ** 0.6;
    return edge * (0.35 + 0.65 * falloff);
  }

  /** The soft pool of light around the fox, which also pulls a little. */
  haloStrength(x, y) {
    const dist = this.distanceTo(x, y);
    const reach = this.tuning.haloRadius;
    if (dist > reach) return 0;
    return clamp(1 - dist / reach, 0, 1) * 0.8;
  }

  inFlare(x, y) {
    if (!this.flaring) return 0;
    const dist = this.distanceTo(x, y);
    if (dist > this.flareRadius) return 0;
    return clamp(1 - dist / this.flareRadius, 0, 1);
  }
}
