// Prismwake: every tuning number, colour and name lives here. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the browser window.
export const FIELD = { width: 1280, height: 720, cx: 640, cy: 360 };
export const STEP = 1 / 60;

// The five lost hues, in the order the player restores them. Each one adds a layer
// of colour to the world, so a run literally brightens as it goes well.
export const HUES = [
  { name: 'AMBER',   hex: '#ffb347', rgb: [255, 179, 71] },
  { name: 'ROSE',    hex: '#ff6b8a', rgb: [255, 107, 138] },
  { name: 'VIOLET',  hex: '#a78bfa', rgb: [167, 139, 250] },
  { name: 'CYAN',    hex: '#4fd6e8', rgb: [79, 214, 232] },
  { name: 'VERDANT', hex: '#7ee787', rgb: [126, 231, 135] },
];

export const PALETTE = {
  void: '#05070f', deep: '#0a0e1c', ink: '#f3f6ff', muted: '#8f9dbd',
  panel: 'rgba(9, 13, 27, 0.82)', line: 'rgba(150, 175, 255, 0.20)',
  white: '#ffffff', dim: '#5c6784', danger: '#ff5470',
};
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export const PLAYER = {
  radius: 17, speed: 430, accel: 8, friction: 0.86,
  dashSpeed: 1080, dashTime: 0.15, dashCooldown: 1.15,
  invulnerable: 1.5, maxIntegrity: 3,
};
export const SHARD = { radius: 11, points: 10, life: 16, interval: 0.50, max: 26, perHue: 18 };
export const NULL = { radius: 23, minSpeed: 52, maxSpeed: 132, interval: 1.20, max: 20, chaseLevel: 1 };
export const REFRACT = { radius: 205, cost: 100, perShard: 13, perConversion: 7, points: 25 };
export const DAWN = 100;
export const COMBO = { window: 2.4, max: 8 };
export const BEST_KEY = 'prismwake.best.v1';

export const SCORE = { shard: 10, offHue: 4, conversion: 25, hue: 500, victoryPerSecond: 12 };
