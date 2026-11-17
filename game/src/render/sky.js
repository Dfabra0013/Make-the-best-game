// The sky over every dusk: a low sun (or a moon, on the fourth), slow clouds, two
// ridgelines and a pine treeline. It is drawn from the dusk's palette alone, so a
// new dusk is a new palette and the picture still holds together.

import { TAU, glowBall, linearFill, rgba } from '../engine/draw.js';
import { STAGE } from './layout.js';

const CLOUDS = [
  { y: 58, w: 340, h: 22, x: 120, speed: 5.5, alpha: 0.1 },
  { y: 104, w: 470, h: 27, x: 620, speed: 3.6, alpha: 0.12 },
  { y: 44, w: 260, h: 15, x: 980, speed: 4.4, alpha: 0.08 },
  { y: 150, w: 390, h: 19, x: -60, speed: 2.8, alpha: 0.15 },
  { y: 190, w: 540, h: 17, x: 420, speed: 1.9, alpha: 0.13 },
];

/** A handful of faint stars, for the dusks that are nearly night. */
function drawStars(ctx, palette, time, duskIndex) {
  const count = duskIndex === 3 ? 90 : 46;
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const x = ((i * 733) % 1280) + ((i * 37) % 17);
    const y = ((i * 197) % 210) + 6;
    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.7 + i * 1.9));
    ctx.fillStyle = rgba(palette.sun, 0.5 * twinkle);
    ctx.beginPath();
    ctx.arc(x, y, i % 7 === 0 ? 1.5 : 0.9, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The whole band of sky, from the top of the stage down to the treeline. */
export function drawSky(ctx, palette, time, duskIndex = 0) {
  const horizon = STAGE.horizonY + 18;
  ctx.fillStyle = linearFill(ctx, 0, 0, 0, horizon, [
    [0, palette.top],
    [0.52, palette.mid],
    [0.86, palette.low],
    [1, palette.low],
  ]);
  ctx.fillRect(0, 0, STAGE.width, horizon + 2);

  if (duskIndex >= 3) drawStars(ctx, palette, time, duskIndex);
  drawSun(ctx, palette, time, duskIndex);
  drawClouds(ctx, palette, time);
  drawRidge(ctx, palette, time, 0);
  drawPines(ctx, palette, time);
}

function drawSun(ctx, palette, time, duskIndex) {
  const isMoon = duskIndex === 3;
  const x = 1004;
  const y = isMoon ? 84 : 168;
  const radius = isMoon ? 40 : 58;
  const breathe = 1 + Math.sin(time * 0.5) * 0.02;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowBall(ctx, x, y, radius * 6.5 * breathe, palette.sunGlow, isMoon ? 0.16 : 0.3, 0.02);
  glowBall(ctx, x, y, radius * 2.6 * breathe, palette.sun, isMoon ? 0.3 : 0.5, 0.1);
  ctx.restore();

  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();

  if (isMoon) {
    ctx.fillStyle = rgba(palette.hillMid, 0.45);
    ctx.beginPath();
    ctx.arc(x - 14, y - 10, 9, 0, TAU);
    ctx.arc(x + 12, y + 12, 6, 0, TAU);
    ctx.arc(x + 6, y - 18, 4, 0, TAU);
    ctx.fill();
  } else {
    // Sun bands: the low sun seen through a warm haze.
    ctx.fillStyle = rgba(palette.mid, 0.22);
    for (let i = 0; i < 3; i += 1) {
      const bandY = y - radius * 0.1 + i * radius * 0.42;
      ctx.fillRect(x - radius, bandY, radius * 2, 4 + i * 2);
    }
  }
}

function drawClouds(ctx, palette, time) {
  ctx.save();
  for (const cloud of CLOUDS) {
    const travel = (cloud.x + time * cloud.speed) % (STAGE.width + cloud.w * 2);
    const x = travel - cloud.w;
    ctx.fillStyle = rgba(palette.cloud, cloud.alpha);
    ctx.beginPath();
    ctx.ellipse(x + cloud.w * 0.5, cloud.y, cloud.w * 0.5, cloud.h, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + cloud.w * 0.28, cloud.y + 6, cloud.w * 0.3, cloud.h * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + cloud.w * 0.74, cloud.y + 4, cloud.w * 0.26, cloud.h * 0.66, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function ridgeHeight(x, seed, base, amp, scale) {
  return (
    base +
    Math.sin(x * 0.0021 * scale + seed) * amp +
    Math.sin(x * 0.0057 * scale + seed * 2.3) * amp * 0.42 +
    Math.sin(x * 0.013 * scale + seed * 4.1) * amp * 0.16
  );
}

function drawRidge(ctx, palette, time, seedOffset) {
  // Far ridge.
  ctx.fillStyle = palette.hillFar;
  ctx.beginPath();
  ctx.moveTo(0, STAGE.horizonY + 30);
  for (let x = 0; x <= STAGE.width; x += 16) {
    ctx.lineTo(x, ridgeHeight(x, 1.7 + seedOffset, STAGE.horizonY - 12, 22, 1));
  }
  ctx.lineTo(STAGE.width, STAGE.horizonY + 30);
  ctx.closePath();
  ctx.fill();

  // Near ridge, with a thin rim of the sun's light along its crest.
  const ridge = [];
  for (let x = 0; x <= STAGE.width; x += 16) ridge.push([x, ridgeHeight(x, 5.1, STAGE.horizonY - 2, 15, 1.5)]);
  ctx.beginPath();
  ctx.moveTo(0, STAGE.horizonY + 40);
  for (const [x, y] of ridge) ctx.lineTo(x, y);
  ctx.lineTo(STAGE.width, STAGE.horizonY + 40);
  ctx.closePath();
  ctx.fillStyle = palette.hillMid;
  ctx.fill();

  ctx.beginPath();
  ridge.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = rgba(palette.sun, 0.16);
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function drawPines(ctx, palette, time) {
  const base = STAGE.horizonY + 6;
  ctx.fillStyle = palette.pines;
  for (let i = 0; i < 44; i += 1) {
    const x = -30 + i * 32 + ((i * 37) % 15);
    const h = 26 + ((i * 53) % 34);
    const sway = Math.sin(time * 0.4 + i) * 1.1;
    drawPine(ctx, x + sway, base, h, 14 + ((i * 29) % 9));
  }
  // A few taller ones at the edges, to frame the meadow.
  drawPine(ctx, 42, base + 8, 104, 30);
  drawPine(ctx, 124, base + 5, 78, 23);
  drawPine(ctx, 1244, base + 8, 112, 32);
  drawPine(ctx, 1164, base + 3, 84, 24);
}

function drawPine(ctx, x, base, height, halfWidth) {
  const tiers = 4;
  for (let t = 0; t < tiers; t += 1) {
    const k = t / tiers;
    const y = base - height * k;
    const w = halfWidth * (1 - k * 0.78);
    const h = height * 0.42;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x - w, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(x - 2, base - 4, 4, 10);
}

/** The haze that sits on the horizon line, drawn after the meadow. */
export function drawHorizonHaze(ctx, palette, time) {
  const y = STAGE.horizonY;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = linearFill(ctx, 0, y - 26, 0, y + 54, [
    [0, rgba(palette.fog, 0)],
    [0.45, rgba(palette.fog, 0.14 + Math.sin(time * 0.6) * 0.02)],
    [1, rgba(palette.fog, 0)],
  ]);
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 26, STAGE.width, 80);
  ctx.restore();
}
