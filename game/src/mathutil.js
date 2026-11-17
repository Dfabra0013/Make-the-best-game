// Shared scalar geometry helpers so every module uses identical math primitives.

export const TWO_PI = Math.PI * 2;

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distanceBetween(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

export function pickRandom(rng, items) {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

