// The fox: a small, quick body that carries the lantern. It accelerates rather
// than snapping to a direction, so a dash is a real commitment and a hound's
// lunge can be baited; a dash also hides it from a bite for two frames' worth of
// grace, which is what makes the risky play possible.

import { clamp } from '../engine/draw.js';
import { STAGE, keepInField } from '../render/layout.js';

const BODY_RADIUS = 24;

export class FoxPlayer {
  constructor(x, y, tuning) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.tuning = tuning;
    this.facing = 1;
    this.dashT = 0;
    this.dashCooldown = 0;
    this.dashDir = { x: 1, y: 0 };
    this.invuln = 0;
    this.bob = 0;
    this.radius = BODY_RADIUS;
    this.speedRatio = 0;
    this.stepPhase = 0;
  }

  setTuning(tuning) {
    this.tuning = tuning;
  }

  get dashing() {
    return this.dashT > 0;
  }

  get dashReady() {
    return this.dashCooldown <= 0;
  }

  get invulnerable() {
    return this.invuln > 0 || this.dashing;
  }

  update(dt, { axis, wantsDash }) {
    const tuning = this.tuning;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    if (wantsDash && this.dashCooldown <= 0) {
      const len = Math.hypot(axis.x, axis.y);
      const dir = len > 0.2 ? { x: axis.x / len, y: axis.y / len } : { x: this.facing, y: 0 };
      this.dashDir = dir;
      this.dashT = tuning.dashTime;
      this.dashCooldown = tuning.dashCooldown;
    }

    if (this.dashT > 0) {
      this.dashT = Math.max(0, this.dashT - dt);
      this.vx = this.dashDir.x * tuning.dashSpeed;
      this.vy = this.dashDir.y * tuning.dashSpeed;
    } else {
      this.vx += axis.x * tuning.moveAccel * dt;
      this.vy += axis.y * tuning.moveAccel * dt;
      const damp = Math.exp(-tuning.moveDrag * dt);
      this.vx *= damp;
      this.vy *= damp;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > tuning.moveSpeed) {
        this.vx = (this.vx / speed) * tuning.moveSpeed;
        this.vy = (this.vy / speed) * tuning.moveSpeed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const held = keepInField(this.x, this.y, this.radius);
    if (held.x !== this.x) this.vx *= 0.2;
    if (held.y !== this.y) this.vy *= 0.2;
    this.x = held.x;
    this.y = held.y;

    if (Math.abs(this.vx) > 12) this.facing = this.vx > 0 ? 1 : -1;
    const speed = Math.hypot(this.vx, this.vy);
    this.speedRatio = clamp(speed / tuning.moveSpeed, 0, 1.6);
    this.stepPhase += dt * (4 + speed * 0.035);
    this.bob = Math.sin(this.stepPhase * 2) * (1.2 + speed * 0.004);
  }

  /** A bite lands: the fox is thrown back and the lantern gutters. */
  hurt(fromX, fromY) {
    if (this.invulnerable) return false;
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * 420;
    this.vy = (dy / len) * 420;
    this.invuln = 1.6;
    this.dashT = 0;
    return true;
  }

  /** Where the lantern hangs: just ahead of the fox's shoulder. */
  lanternAnchor() {
    return { x: this.x + this.facing * 20, y: this.y - 36 + this.bob * 0.4 };
  }

  get depth() {
    return clamp((this.y - STAGE.fieldTop) / (STAGE.fieldBottom - STAGE.fieldTop), 0, 1);
  }
}
