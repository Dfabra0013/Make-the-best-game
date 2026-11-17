// The meadow the game is played on: a dark field under the dusk, with a worn
// trail curling from the near corner to the Hollow, grass that leans in the wind,
// a scatter of pale stones and a vignette that keeps the eye in the middle. The
// layout is built once from a fixed seed, so grass never shimmers between frames.

import { TAU, linearFill, mixColor, radialFill, rgba } from '../engine/draw.js';
import { STAGE } from './layout.js';

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The fixed furniture of the meadow: tufts, stones, moss, stipple and fireflies. */
export const MEADOW = (() => {
  const rand = makeRandom(0x51ed);
  const top = STAGE.horizonY;
  const height = STAGE.fieldBottom - top;

  // A fine stipple of lit grass tips: the field's texture, cheap to draw.
  const stipple = [];
  for (let i = 0; i < 700; i += 1) {
    const y = top + rand() * (height + 60);
    const depth = (y - top) / height;
    stipple.push({
      x: rand() * STAGE.width,
      y,
      r: 0.7 + rand() * 1.5 + depth * 0.8,
      alpha: 0.05 + rand() * 0.12 + depth * 0.05,
    });
  }

  const tufts = [];
  for (let i = 0; i < 90; i += 1) {
    const y = STAGE.fieldTop + 10 + rand() * (height - 30);
    const depth = (y - top) / height;
    tufts.push({
      x: rand() * STAGE.width,
      y,
      height: 6 + rand() * 5 + depth * 9,
      lean: (rand() - 0.5) * 1.2,
      blades: 2 + Math.floor(rand() * 3),
      shade: rand(),
    });
  }
  tufts.sort((a, b) => a.y - b.y);

  const stones = [];
  for (let i = 0; i < 26; i += 1) {
    stones.push({
      x: rand() * STAGE.width,
      y: STAGE.fieldTop + rand() * height,
      rx: 3 + rand() * 7,
      ry: 1.6 + rand() * 3,
      shade: rand(),
    });
  }
  stones.sort((a, b) => a.y - b.y);

  const moss = [];
  for (let i = 0; i < 30; i += 1) {
    moss.push({
      x: rand() * STAGE.width,
      y: top + rand() * height,
      r: 50 + rand() * 130,
      alpha: 0.04 + rand() * 0.08,
    });
  }

  const fireflies = [];
  for (let i = 0; i < 30; i += 1) {
    fireflies.push({
      x: rand() * STAGE.width,
      y: STAGE.horizonY + 30 + rand() * (STAGE.fieldBottom - STAGE.horizonY - 60),
      phase: rand() * TAU,
      speed: 0.2 + rand() * 0.5,
      radius: 1 + rand() * 1.6,
    });
  }

  const clumps = [];
  for (let i = 0; i < 14; i += 1) {
    clumps.push({
      x: rand() * STAGE.width,
      y: STAGE.fieldTop + rand() * height,
      rx: 60 + rand() * 150,
      ry: 16 + rand() * 34,
      alpha: 0.05 + rand() * 0.06,
    });
  }

  return { tufts, stones, moss, fireflies, stipple, clumps };
})();

/** Ground, moonlight, trail, moss, grass, stones and fireflies, in that order. */
export function drawMeadow(ctx, palette, time, meadow = MEADOW) {
  ctx.fillStyle = linearFill(ctx, 0, STAGE.horizonY, 0, STAGE.height, [
    [0, mixColor(palette.groundTop, palette.fog, 0.2)],
    [0.12, palette.groundTop],
    [0.5, mixColor(palette.groundTop, palette.groundLow, 0.62)],
    [1, palette.groundLow],
  ]);
  ctx.fillRect(0, STAGE.horizonY - 4, STAGE.width, STAGE.height - STAGE.horizonY + 4);

  // The last of the sun, lying across the top of the field.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radialFill(ctx, STAGE.width * 0.78, STAGE.horizonY, 40, STAGE.width * 0.7, [
    [0, rgba(palette.sun, 0.11)],
    [0.5, rgba(palette.fog, 0.05)],
    [1, rgba(palette.fog, 0)],
  ]);
  ctx.fillRect(0, STAGE.horizonY - 4, STAGE.width, 340);
  ctx.restore();

  drawTrail(ctx, palette);
  drawMoss(ctx, palette, meadow);
  drawStipple(ctx, palette, meadow);
  drawGrass(ctx, palette, time, meadow);
  drawStones(ctx, palette, meadow);
  drawFireflies(ctx, palette, time, meadow);
  drawGroundMist(ctx, palette, time);
}

function drawTrail(ctx, palette) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(mixColor(palette.grass, palette.low, 0.3), 0.14);
  ctx.lineWidth = 54;
  ctx.beginPath();
  ctx.moveTo(70, 800);
  ctx.bezierCurveTo(300, 700, 620, 720, 880, 580);
  ctx.bezierCurveTo(950, 540, 990, 516, 1032, 494);
  ctx.stroke();
  ctx.strokeStyle = rgba(mixColor(palette.grass, palette.low, 0.46), 0.1);
  ctx.lineWidth = 20;
  ctx.stroke();
  ctx.restore();
}

function drawMoss(ctx, palette, meadow) {
  ctx.save();
  for (const patch of meadow.moss) {
    ctx.fillStyle = radialFill(ctx, patch.x, patch.y, 0, patch.r, [
      [0, rgba(mixColor(palette.grass, palette.sun, 0.2), patch.alpha * 2)],
      [1, rgba(palette.grass, 0)],
    ]);
    ctx.beginPath();
    ctx.arc(patch.x, patch.y, patch.r, 0, TAU);
    ctx.fill();
  }
  for (const clump of meadow.clumps) {
    ctx.fillStyle = radialFill(ctx, clump.x, clump.y, 0, clump.rx, [
      [0, rgba(palette.groundLow, clump.alpha * 1.6)],
      [1, rgba(palette.groundLow, 0)],
    ]);
    ctx.beginPath();
    ctx.ellipse(clump.x, clump.y, clump.rx, clump.ry, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawStipple(ctx, palette, meadow) {
  ctx.save();
  for (const speck of meadow.stipple) {
    ctx.fillStyle = rgba(mixColor(palette.grass, palette.sun, 0.35), speck.alpha);
    ctx.beginPath();
    ctx.arc(speck.x, speck.y, speck.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawGrass(ctx, palette, time, meadow) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const tuft of meadow.tufts) {
    const sway = Math.sin(time * 0.8 + tuft.x * 0.011 + tuft.y * 0.006) * 2.6 + tuft.lean * 3;
    const depth = (tuft.y - STAGE.horizonY) / (STAGE.fieldBottom - STAGE.horizonY);
    ctx.strokeStyle = rgba(mixColor(palette.grass, palette.sun, 0.1 + tuft.shade * 0.16), 0.1 + depth * 0.16);
    ctx.lineWidth = 1 + depth * 0.6;
    for (let b = 0; b < tuft.blades; b += 1) {
      const offset = (b - (tuft.blades - 1) / 2) * 3.4;
      const tipX = tuft.x + offset + sway * (0.6 + b * 0.25);
      const tipY = tuft.y - tuft.height * (0.75 + b * 0.14);
      ctx.beginPath();
      ctx.moveTo(tuft.x + offset, tuft.y);
      ctx.quadraticCurveTo(tuft.x + offset + sway * 0.25, tuft.y - tuft.height * 0.5, tipX, tipY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStones(ctx, palette, meadow) {
  for (const stone of meadow.stones) {
    ctx.fillStyle = rgba(mixColor(palette.stone, palette.sun, 0.08 + stone.shade * 0.14), 0.62);
    ctx.beginPath();
    ctx.ellipse(stone.x, stone.y, stone.rx, stone.ry, 0, 0, TAU);
    ctx.fill();
  }
}

function drawFireflies(ctx, palette, time, meadow) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const fly of meadow.fireflies) {
    const pulse = (Math.sin(time * fly.speed * 2 + fly.phase) + 1) / 2;
    if (pulse < 0.45) continue;
    const x = fly.x + Math.sin(time * fly.speed + fly.phase) * 18;
    const y = fly.y + Math.cos(time * fly.speed * 0.8 + fly.phase) * 12;
    const alpha = (pulse - 0.45) / 0.55;
    ctx.fillStyle = radialFill(ctx, x, y, 0, fly.radius * 9, [
      [0, rgba(palette.wisp, alpha * 0.4)],
      [0.4, rgba(palette.wisp, alpha * 0.12)],
      [1, rgba(palette.wisp, 0)],
    ]);
    ctx.beginPath();
    ctx.arc(x, y, fly.radius * 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba('#ffffff', alpha * 0.8);
    ctx.beginPath();
    ctx.arc(x, y, fly.radius, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Slow bands of haze lying on the grass, so the field is never quite still. */
function drawGroundMist(ctx, palette, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let band = 0; band < 3; band += 1) {
    const y = STAGE.horizonY + 60 + band * 120 + Math.sin(time * 0.3 + band) * 10;
    const drift = Math.sin(time * 0.12 + band * 2.1) * 60;
    ctx.fillStyle = radialFill(ctx, STAGE.width * 0.5 + drift, y, 40, STAGE.width * 0.62, [
      [0, rgba(palette.fog, 0.05)],
      [1, rgba(palette.fog, 0)],
    ]);
    ctx.beginPath();
    ctx.ellipse(STAGE.width * 0.5 + drift, y, STAGE.width * 0.62, 46, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Darkened corners, and a slight lift where the Hollow glows. */
export function drawVignette(ctx, palette) {
  ctx.save();
  ctx.fillStyle = radialFill(ctx, STAGE.width / 2, STAGE.height * 0.66, STAGE.height * 0.34, STAGE.width * 0.82, [
    [0, rgba(palette.groundLow, 0)],
    [0.62, rgba(palette.groundLow, 0.16)],
    [1, rgba(palette.groundLow, 0.62)],
  ]);
  ctx.fillRect(0, STAGE.horizonY, STAGE.width, STAGE.height - STAGE.horizonY);
  ctx.restore();
}
