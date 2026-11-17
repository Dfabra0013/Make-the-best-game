// An autopilot for the headless runs: it plays a dusk the way a hand does, which
// is what makes the screenshots in screenshots/ moments of a real session and lets
// the game's tuning be checked without a browser in the loop. It gathers the flock
// in the lantern's cone, stands between the flock and the Hollow, and backs toward
// the doorway while the wisps follow.

import { PlayScene } from '../game/src/scenes/play.js';

const HOLD_DISTANCE = 150;

export class Autopilot {
  constructor() {
    this.panic = 0;
    this.awayFrom = { x: 0, y: 0 };
  }

  drive(game, input, dt) {
    input.held.clear();
    input.pointer.inside = true;
    const scene = game.scene;
    if (!(scene instanceof PlayScene) || scene.state !== 'playing') return;

    const { fox, flock, hollow, pack, light } = scene;
    const wisps = flock.wisps.filter((wisp) => !wisp.delivered);
    if (wisps.length === 0) return;

    let cx = 0;
    let cy = 0;
    for (const wisp of wisps) {
      cx += wisp.x;
      cy += wisp.y;
    }
    cx /= wisps.length;
    cy /= wisps.length;

    // Aim the lantern at the flock's middle: that is what holds a flock together.
    input.pointer.x = cx;
    input.pointer.y = cy;

    // Stand on the Hollow's side of the flock and back toward the door.
    const hx = hollow.x - cx;
    const hy = hollow.y - cy;
    const hlen = Math.hypot(hx, hy) || 1;
    const nearHome = hlen < hollow.radius * 2.2;
    const lead = nearHome ? 20 : HOLD_DISTANCE;
    let goalX = cx + (hx / hlen) * lead;
    let goalY = cy + (hy / hlen) * lead;

    // When the flock is nearly home, fetch the last one that is not.
    if (nearHome) {
      const straggler = wisps.reduce((far, wisp) => {
        const d = Math.hypot(wisp.x - hollow.x, wisp.y - hollow.y);
        return d > far.d ? { d, wisp } : far;
      }, { d: 0, wisp: null });
      if (straggler.wisp && straggler.d > hollow.radius * 2.6) {
        goalX = straggler.wisp.x;
        goalY = straggler.wisp.y;
        input.pointer.x = straggler.wisp.x;
        input.pointer.y = straggler.wisp.y;
      }
    }

    const nearestHound = pack.hounds.reduce(
      (best, hound) => {
        const d = Math.hypot(hound.x - fox.x, hound.y - fox.y);
        return d < best.d ? { d, hound } : best;
      },
      { d: Infinity, hound: null },
    );

    // A crouching hound is a bite about to happen: keep the beam on the flock but
    // take the fox out of the way for a moment.
    if (nearestHound.d < 150) {
      this.panic = 0.45;
      this.awayFrom = { x: nearestHound.hound.x, y: nearestHound.hound.y };
    }

    if (this.panic > 0) {
      this.panic -= dt;
      const dx = fox.x - this.awayFrom.x;
      const dy = fox.y - this.awayFrom.y;
      const len = Math.hypot(dx, dy) || 1;
      goalX = fox.x + (dx / len) * 220;
      goalY = fox.y + (dy / len) * 220;
      if (fox.dashReady) input.pressed.add('ShiftLeft');
    } else if (Math.hypot(goalX - fox.x, goalY - fox.y) > 240 && fox.dashReady && nearestHound.d > 300) {
      input.pressed.add('ShiftLeft');
    }

    if (nearestHound.d < 230 && light.canFlare() && light.wick > light.flareCost * 1.15) {
      input.pressed.add('Mouse0');
    }

    const dx = goalX - fox.x;
    const dy = goalY - fox.y;
    if (dx > 12) input.held.add('KeyD');
    if (dx < -12) input.held.add('KeyA');
    if (dy > 12) input.held.add('KeyS');
    if (dy < -12) input.held.add('KeyW');
  }
}
