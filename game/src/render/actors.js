// Everything with a body in it: the Hollow's arch, the fox and its lantern, the
// wisps and the hounds. They are drawn as flat paper-cut silhouettes with one warm
// rim light, which is what gives the meadow its storybook look and keeps the
// glowing things glowing against the dark.

import { TAU, clamp, fillRoundRect, glowBall, linearFill, mixColor, radialFill, rgba } from '../engine/draw.js';

/** A soft shadow on the grass, in perspective: flatter the higher up the meadow. */
export function drawShadow(ctx, x, y, rx, ry, palette, alpha = 0.32) {
  ctx.fillStyle = radialFill(ctx, x, y, 0, rx, [
    [0, rgba(palette.groundLow, alpha)],
    [0.7, rgba(palette.groundLow, alpha * 0.5)],
    [1, rgba(palette.groundLow, 0)],
  ]);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/** The lantern's light: a cone forward, a pool around the fox, and a flare. */
export function drawLanternLight(ctx, light, palette, time) {
  const { origin } = light;
  const range = light.range;
  const half = light.coneHalf;
  const flick = 0.9 + Math.sin(time * 9.1) * 0.05 + Math.sin(time * 21.7) * 0.03;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.arc(origin.x, origin.y, range * flick, light.angle - half, light.angle + half);
  ctx.closePath();
  ctx.fillStyle = radialFill(ctx, origin.x, origin.y, 10, range * flick, [
    [0, rgba(palette.lantern, 0.56)],
    [0.34, rgba(palette.lantern, 0.26)],
    [0.7, rgba(palette.lantern, 0.1)],
    [1, rgba(palette.lantern, 0)],
  ]);
  ctx.fill();

  // The wide halo, which pulls a little and reads as the fox's own warmth.
  glowBall(ctx, origin.x, origin.y, light.tuning.haloRadius * 1.3, palette.lantern, 0.34, 0.04);
  glowBall(ctx, origin.x, origin.y, 66 * flick, palette.lantern, 0.6, 0.06);
  ctx.restore();
}

/** The flare: a bright core, a ring and a wash of light over the grass. */
export function drawFlare(ctx, light, palette, time) {
  if (!light.flaring) return;
  const { origin } = light;
  const r = light.flareRadius;
  const strength = clamp(1 - light.flareT / 0.45, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radialFill(ctx, origin.x, origin.y, r * 0.2, r, [
    [0, rgba(palette.lantern, 0.34 * strength)],
    [0.55, rgba(palette.sun, 0.18 * strength)],
    [1, rgba(palette.sun, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(palette.sun, 0.5 * strength);
  ctx.lineWidth = 3 + 5 * strength;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, r * 0.94, 0, TAU);
  ctx.stroke();
  glowBall(ctx, origin.x, origin.y, 46 + r * 0.16, palette.sun, 0.8 * strength, 0.1);
  ctx.restore();
}

/** The Hollow: a standing-stone doorway with a light in it that wisps go home to. */
export function drawHollow(ctx, hollow, palette, time) {
  const { x, y, radius } = hollow;
  const pulse = hollow.pulse;
  const breathe = 0.82 + Math.sin(time * 1.5) * 0.1 + pulse * 0.6;
  const baseY = y + radius * 0.52;
  const innerW = radius * 1.1;
  const innerH = radius * 1.24;
  const outerW = radius * 1.88;
  const outerH = radius * 1.5;
  const stone = mixColor(palette.stone, palette.groundLow, 0.16);
  const stoneDark = mixColor(palette.stone, palette.groundLow, 0.52);
  const stoneLit = mixColor(palette.stone, palette.sun, 0.3);
  const throat = mixColor(palette.hollow, '#ffcf8a', 0.45);

  // Light spilling up out of the throat, then the warm pool on the threshold.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = linearFill(ctx, x, baseY - innerH, x, baseY - innerH * 0.1, [
    [0, rgba(throat, 0)],
    [1, rgba(throat, 0.16 * breathe)],
  ]);
  ctx.beginPath();
  ctx.moveTo(x - innerW * 0.44, baseY - innerH * 1.5);
  ctx.lineTo(x + innerW * 0.44, baseY - innerH * 1.5);
  ctx.lineTo(x + innerW * 0.5, baseY - innerH * 0.05);
  ctx.lineTo(x - innerW * 0.5, baseY - innerH * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, baseY + radius * 0.1, radius * 1.25, radius * 0.26, 0, 0, TAU);
  ctx.fillStyle = radialFill(ctx, x, baseY + radius * 0.1, 4, radius * 1.25, [
    [0, rgba(throat, 0.32 * breathe)],
    [1, rgba(palette.hollow, 0)],
  ]);
  ctx.fill();
  ctx.restore();

  // The stone: a dark block, with its lit face turned toward the moon.
  archPath(ctx, x, baseY, outerW, outerH);
  ctx.fillStyle = stone;
  ctx.fill();
  ctx.fillStyle = stoneDark;
  archPath(ctx, x + outerW * 0.06, baseY + 3, outerW * 0.86, outerH * 0.97);
  ctx.fill();
  // Courses of cut stone across the face of the arch.
  ctx.save();
  ctx.strokeStyle = rgba(palette.groundLow, 0.55);
  ctx.lineWidth = 1.2;
  for (let row = 0; row < 5; row += 1) {
    const ry = baseY - outerH * (0.06 + row * 0.19);
    const halfW = outerW * 0.5 * Math.min(1, 0.55 + row * 0.16);
    ctx.beginPath();
    ctx.moveTo(x - halfW, ry);
    ctx.lineTo(x + halfW, ry - 1.5);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = rgba(stoneLit, 0.6);
  ctx.lineWidth = 2;
  archPath(ctx, x, baseY, outerW, outerH);
  ctx.stroke();

  // The lintel sits on the arch's shoulders, where the stone is at its widest.
  const capW = outerW * 1.04;
  const capY = baseY - outerH + outerW / 2 - 7;
  fillRoundRect(ctx, x - capW / 2, capY, capW, 13, 3, stoneDark);
  fillRoundRect(ctx, x - capW / 2 + 3, capY + 2, capW - 6, 3.5, 2, rgba(stoneLit, 0.45));

  // The throat: dark at the top, warm where it meets the ground.
  archPath(ctx, x, baseY - radius * 0.02, innerW, innerH);
  ctx.fillStyle = linearFill(ctx, x, baseY - innerH, x, baseY, [
    [0, rgba(mixColor(palette.groundLow, '#150c18', 0.5), 0.96)],
    [0.42, rgba(mixColor(palette.hollow, '#2a1430', 0.55), 0.92)],
    [0.82, rgba(throat, 0.85)],
    [1, rgba('#ffe6bd', 0.95)],
  ]);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radialFill(ctx, x, baseY - innerH * 0.16, 4, innerW * 0.62, [
    [0, rgba('#fff4d8', 0.5 * breathe)],
    [1, rgba(palette.hollow, 0)],
  ]);
  archPath(ctx, x, baseY - radius * 0.02, innerW, innerH);
  ctx.fill();
  ctx.restore();

  if (pulse > 0) {
    // The ripple fades as it widens, so a delivery is a shiver, not a hooped ring.
    const fade = Math.max(0, 1 - hollow.rippleRadius / (radius * 2.6));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(palette.hollow, pulse * 0.2 * fade);
    ctx.lineWidth = 1.2 + pulse * 1.2;
    ctx.beginPath();
    ctx.ellipse(x, baseY + 4, hollow.rippleRadius * 0.7, hollow.rippleRadius * 0.22, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Runes cut into the arch, lit from inside it.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i += 1) {
    const spot = hollow.runePosition(i, 7);
    const twinkle = 0.4 + 0.4 * Math.sin(time * 2.2 + i * 1.7) + pulse * 0.5;
    glowBall(ctx, spot.x, spot.y, 7 + pulse * 6, i % 2 === 0 ? palette.hollow : palette.wisp, 0.3 * twinkle * breathe, 0.2);
  }
  ctx.restore();

  // Stones ringing the threshold.
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI * (0.1 + i * 0.16);
    const sx = x + Math.cos(angle) * radius * 1.55;
    const sy = baseY + Math.sin(angle) * radius * 0.26 - 2;
    ctx.fillStyle = rgba(stone, 0.95);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 10 + (i % 3) * 4, 5 + (i % 2) * 2.4, 0, 0, TAU);
    ctx.fill();
  }
}

/** An arch: a doorway with a round top, used for the Hollow's frame and its light. */
function archPath(ctx, x, baseY, width, height) {
  const r = width / 2;
  const shoulder = baseY - height + r;
  ctx.beginPath();
  ctx.moveTo(x - r, baseY);
  ctx.lineTo(x - r, shoulder);
  ctx.arc(x, shoulder, r, Math.PI, 0);
  ctx.lineTo(x + r, baseY);
  ctx.closePath();
}

/** A wisp: a glow with a body, asleep or awake. */
export function drawWisp(ctx, wisp, palette, time) {
  const asleep = wisp.asleep;
  const tint = asleep ? mixColor(palette.stone, palette.wisp, 0.25) : wisp.type === 'mote' ? mixColor(palette.wisp, '#ffffff', 0.35) : palette.wisp;
  const bob = Math.sin(wisp.bob) * 2.2;
  const x = wisp.x;
  const y = wisp.y + bob;
  const flicker = 0.82 + Math.sin(time * 6 + wisp.phase) * 0.1 + wisp.warmth * 0.25;
  const glowSize = wisp.glow * (asleep ? 0.5 : 1) * (wisp.frightened ? 1.25 : 1);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowBall(ctx, x, y, glowSize * (asleep ? 1.1 : 1.7), tint, (asleep ? 0.2 : 0.42) * flicker, 0.05);
  glowBall(ctx, x, y, glowSize * 0.72, tint, (asleep ? 0.3 : 0.6) * flicker, 0.14);
  ctx.restore();

  ctx.fillStyle = asleep ? rgba(mixColor(palette.stone, palette.wisp, 0.12), 0.9) : rgba(mixColor(tint, '#ffffff', 0.55), 0.95);
  ctx.beginPath();
  ctx.arc(x, y, wisp.radius * (asleep ? 0.78 : 0.62), 0, TAU);
  ctx.fill();
  if (!asleep) {
    ctx.fillStyle = rgba('#ffffff', 0.92);
    ctx.beginPath();
    ctx.arc(x - wisp.radius * 0.16, y - wisp.radius * 0.18, wisp.radius * 0.24, 0, TAU);
    ctx.fill();
  } else {
    ctx.strokeStyle = rgba(palette.stone, 0.8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x, wisp.y, wisp.radius * 0.9, 0.4, 2.2);
    ctx.stroke();
  }

  // A wisp's own little tail of light.
  if (!asleep) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const trail = clamp(Math.hypot(wisp.vx, wisp.vy) / 120, 0, 1);
    for (let i = 1; i <= 3; i += 1) {
      const t = i / 4;
      ctx.fillStyle = rgba(tint, 0.16 * trail * (1 - t));
      ctx.beginPath();
      ctx.arc(x - wisp.vx * 0.035 * i, y - wisp.vy * 0.035 * i + bob * 0.2, wisp.radius * (0.5 - t * 0.28), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** A hound: a low, angular silhouette with two eyes that give it away. */
export function drawHound(ctx, hound, palette, time) {
  const facing = hound.facing;
  const crouch = hound.crouching ? clamp(hound.lungeProgress, 0, 1) : 0;
  const lunge = hound.lunging ? 1 : 0;
  const flee = hound.fleeT > 0 || hound.state === 'flee';
  const size = hound.radius / 20;
  const bob = Math.sin(hound.bob) * (crouch > 0 ? 0.6 : 1.8);
  const y = hound.y + bob + crouch * 5;
  const bodyDark = mixColor(palette.hound, palette.groundLow, 0.2);
  const rim = rgba(mixColor(palette.hound, palette.houndEye, 0.35), 0.7);

  drawShadow(ctx, hound.x, hound.y + hound.radius * 0.62, hound.radius * 1.5, hound.radius * 0.44, palette, 0.45);

  ctx.save();
  ctx.translate(hound.x, y);
  ctx.scale(facing, 1);
  ctx.fillStyle = bodyDark;

  // Legs.
  const legPhase = Math.sin(hound.bob * 2.2) * (flee ? 5 : 2.4);
  for (const [lx, lw] of [[-14, 3], [-8, 2.6], [8, 2.6], [14, 3]]) {
    ctx.fillRect(lx * size - lw / 2, 0, lw * size, (12 + Math.abs(lx) * 0.2) * size - legPhase * 0.3);
  }

  // Body: a wedge that slopes from the shoulders down to the hips.
  ctx.beginPath();
  ctx.moveTo(-20 * size, -4 * size);
  ctx.quadraticCurveTo(-6 * size, -18 * size - crouch * 3, 12 * size, -14 * size);
  ctx.lineTo(22 * size, -8 * size);
  ctx.quadraticCurveTo(24 * size, 4 * size, 8 * size, 4 * size);
  ctx.lineTo(-18 * size, 5 * size);
  ctx.closePath();
  ctx.fill();

  // Head and jaw.
  ctx.beginPath();
  ctx.moveTo(16 * size, -14 * size);
  ctx.lineTo(30 * size, -8 * size);
  ctx.lineTo(32 * size, 0);
  ctx.lineTo(18 * size, -2 * size);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20 * size, -14 * size);
  ctx.lineTo(26 * size, -24 * size);
  ctx.lineTo(30 * size, -12 * size);
  ctx.closePath();
  ctx.fill();

  // Tail, low and stiff.
  ctx.beginPath();
  ctx.moveTo(-18 * size, -6 * size);
  ctx.quadraticCurveTo(-32 * size, -12 * size, -38 * size, -2 * size);
  ctx.quadraticCurveTo(-30 * size, -2 * size, -18 * size, 0);
  ctx.closePath();
  ctx.fill();

  if (hound.type === 'brute') {
    // The bramble back: a row of thorns.
    for (let i = 0; i < 5; i += 1) {
      const tx = -14 + i * 8;
      ctx.beginPath();
      ctx.moveTo(tx, -16 - Math.sin(i) * 2);
      ctx.lineTo(tx + 4, -28);
      ctx.lineTo(tx + 7, -15);
      ctx.closePath();
      ctx.fill();
    }
  }

  // A single rim light along the back, from the sun.
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-18 * size, -6 * size);
  ctx.quadraticCurveTo(-6 * size, -17 * size - crouch * 3, 14 * size, -13 * size);
  ctx.stroke();
  ctx.restore();

  // Eyes: the only warm thing about a hound.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const eyeX = hound.x + facing * 24 * size;
  const eyeY = y - 9 * size;
  const glow = 0.55 + hound.eyeGlow * 0.45 + lunge * 0.4;
  glowBall(ctx, eyeX, eyeY, (7 + hound.eyeGlow * 5) * size, palette.houndEye, glow * 0.9, 0.2);
  if (crouch > 0) {
    // The crouch is a warning: a red line along the ground where the bite will go.
    ctx.strokeStyle = rgba(palette.houndEye, 0.16 + crouch * 0.3);
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 8]);
    ctx.beginPath();
    ctx.moveTo(hound.x, hound.y + 4);
    ctx.lineTo(hound.x + facing * 120, hound.y + 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** The fox: a small, warm silhouette with a brush tail and a lantern at its shoulder. */
export function drawFox(ctx, fox, palette, time) {
  const facing = fox.facing;
  const bob = fox.bob;
  const y = fox.y + bob;
  const running = clamp(fox.speedRatio, 0, 1);
  const dashStretch = fox.dashing ? 1.16 : 1;
  const flicker = 0.9 + Math.sin(time * 12.3) * 0.06 + Math.sin(time * 27.1) * 0.04;
  const scale = fox.radius / 17;

  drawShadow(ctx, fox.x, fox.y + 15 * scale, 27 * scale * (1 + running * 0.08), 9 * scale, palette, 0.42);

  if (fox.invuln > 0 && Math.floor(fox.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.6;

  ctx.save();
  ctx.translate(fox.x, y);
  ctx.scale(facing * dashStretch * scale, scale);

  const body = mixColor(palette.fox, palette.foxDeep, 0.22 + running * 0.1);
  const bodyLight = mixColor(palette.fox, '#ffffff', 0.28);
  const dark = mixColor(palette.fox, palette.foxDeep, 0.55);

  // The tail: a thick brush, swept back and up, with a pale tip.
  const tailSwing = Math.sin(fox.stepPhase * 1.5) * 5 * (0.4 + running);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.bezierCurveTo(-24, -12 + tailSwing * 0.3, -36, -24 + tailSwing * 0.7, -40, -38 + tailSwing);
  ctx.bezierCurveTo(-30, -34 + tailSwing, -18, -24 + tailSwing * 0.5, -6, -16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(mixColor(palette.fox, '#ffffff', 0.72), 0.95);
  ctx.beginPath();
  ctx.ellipse(-37, -36 + tailSwing, 5.4, 4, -0.75, 0, TAU);
  ctx.fill();

  // Legs, in a trot.
  const stride = Math.sin(fox.stepPhase * 2.3) * (2.6 + running * 4.4);
  ctx.fillStyle = dark;
  ctx.fillRect(-13, -5, 3.6, 9 + stride * 0.22);
  ctx.fillRect(-4, -4, 3.6, 10 - stride * 0.22);
  ctx.fillRect(7, -5, 3.6, 9 + stride * 0.22);
  ctx.fillRect(14, -6, 3.4, 8 - stride * 0.22);

  // Body and chest.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-2, -13, 19, 11.5, -0.05, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(bodyLight, 0.9);
  ctx.beginPath();
  ctx.ellipse(6, -12, 11, 8.5, -0.2, 0, TAU);
  ctx.fill();

  // A contour: without it the fox dissolves into the light it carries.
  ctx.strokeStyle = rgba(dark, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-2, -13, 19, 11.5, -0.05, 0, TAU);
  ctx.stroke();

  // Head: a wedge with a snout, and two ears.
  ctx.fillStyle = bodyLight;
  ctx.beginPath();
  ctx.ellipse(18, -23, 9.5, 8.4, 0.12, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, -20);
  ctx.lineTo(34, -17.5);
  ctx.lineTo(24, -14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(12, -29);
  ctx.lineTo(10, -42);
  ctx.lineTo(20, -30);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(21, -30);
  ctx.lineTo(25, -42);
  ctx.lineTo(29, -27);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(mixColor(palette.fox, '#ffffff', 0.75), 0.95);
  ctx.beginPath();
  ctx.moveTo(11, -37);
  ctx.lineTo(11.6, -41);
  ctx.lineTo(15, -36.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(24, -37);
  ctx.lineTo(25, -41);
  ctx.lineTo(27, -36);
  ctx.closePath();
  ctx.fill();

  // Face: an eye and the dark tip of the snout.
  ctx.fillStyle = rgba(palette.groundLow, 0.92);
  ctx.beginPath();
  ctx.ellipse(21, -24, 2.4, 2.9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba('#ffe9c4', 0.9);
  ctx.beginPath();
  ctx.arc(21.8, -25.2, 0.9, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(33, -17.6, 1.5, 0, TAU);
  ctx.fill();

  // The rim light that keeps the fox from sinking into the meadow.
  ctx.strokeStyle = rgba(palette.fox, 0.75);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-18, -18);
  ctx.quadraticCurveTo(-4, -26, 12, -22);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;

  // The lantern hangs at the fox's shoulder and is the light everything else sees.
  const anchor = fox.lanternAnchor();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowBall(ctx, anchor.x, anchor.y, 40 * flicker, palette.lantern, 0.4, 0.1);
  glowBall(ctx, anchor.x, anchor.y, 14 * flicker, '#ffffff', 0.7, 0.3);
  ctx.restore();
  ctx.strokeStyle = rgba(dark, 0.95);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(anchor.x - 2, anchor.y - 16);
  ctx.lineTo(anchor.x, anchor.y - 6);
  ctx.stroke();
  fillRoundRect(ctx, anchor.x - 5, anchor.y - 7, 10, 13, 3, rgba(mixColor(palette.lantern, '#ffffff', 0.35), 0.95));
}

/** Every body, back to front, so nearer things overlap further ones. */
export function drawBodies(ctx, { fox, wisps, hounds, palette, time }) {
  const bodies = [];
  for (const wisp of wisps) bodies.push({ y: wisp.y, draw: () => drawWisp(ctx, wisp, palette, time) });
  for (const hound of hounds) bodies.push({ y: hound.y, draw: () => drawHound(ctx, hound, palette, time) });
  bodies.push({ y: fox.y, draw: () => drawFox(ctx, fox, palette, time) });
  bodies.sort((a, b) => a.y - b.y);
  for (const body of bodies) body.draw();
}
