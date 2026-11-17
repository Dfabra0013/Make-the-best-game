// Deterministic scenes for the four real screenshots. Each one sets the world's
// own state and then the normal renderer paints it, so the images are genuine
// renders of the shipped game code, never mock-ups or composites.
import { HUES, FIELD } from './config.js';
import { createRandom } from './random.js';
import { spawnShard, spawnNull, burstParticles, addRipple } from './spawn.js';

function scatter(world, seed, shards, nulls, difficulty) {
  const r = createRandom(seed);
  const s = world.state;
  for (let i = 0; i < shards; i += 1) spawnShard(world.state, r, i % 3 === 0 ? Math.floor(r() * HUES.length) : s.hueIndex);
  for (let i = 0; i < nulls; i += 1) spawnNull(world.state, r, difficulty);
  for (const n of s.nulls) {
    n.x = Math.max(90, Math.min(FIELD.width - 90, n.x));
    n.y = Math.max(120, Math.min(FIELD.height - 120, n.y));
  }
  for (let i = 0; i < 16; i += 1) {
    burstParticles(world.state, r, r() * FIELD.width, r() * FIELD.height, HUES[Math.floor(r() * HUES.length)].hex, 2, 40);
  }
}

export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  s.banner = ''; s.bannerTime = 0; s.shake = 0; s.flash = 0;
  const r = createRandom(7319);

  if (name === 'title') {
    s.screen = 'title'; s.restored = []; s.hueIndex = 0; s.hueProgress = 0;
    s.shards.length = 0; s.nulls.length = 0; s.particles.length = 0; s.ripples.length = 0;
    // A few quiet motes frame the menu without crossing the text.
    const deco = [[150, 150, 0], [1130, 170, 1], [1100, 560, 2], [170, 545, 3], [640, 118, 4]];
    for (const [x, y, hue] of deco) {
      s.shards.push({ x, y, vx: 0, vy: 0, hue, spin: 0.4, life: 99, age: 0 });
    }
    return;
  }

  if (name === 'play') {
    s.screen = 'play'; s.restored = [0, 1]; s.hueIndex = 2; s.hueProgress = 0.61;
    s.score = 2480; s.best = 6120; s.combo = 4; s.comboTime = 2.0;
    s.refract = 72; s.integrity = 2; s.elapsed = 39; s.dawn = 61;
    s.stats = { shards: 52, conversions: 9, refracts: 3, hits: 1, hues: 2 };
    s.banner = 'COLLECT THE LIT HUE'; s.bannerTime = 1.8;
    s.player.x = 612; s.player.y = 392; s.player.vx = 120; s.player.vy = -60; s.player.angle = -0.5;
    scatter(world, 4242, 13, 6, 2);
    addRipple(s, s.player.x, s.player.y, HUES[2].hex, 120);
    return;
  }

  if (name === 'victory') {
    s.screen = 'victory'; s.outcome = 'victory';
    s.restored = [0, 1, 2, 3, 4]; s.hueIndex = 5; s.hueProgress = 1;
    s.score = 12840; s.best = 12840; s.combo = 0; s.refract = 100; s.integrity = 3;
    s.elapsed = 66; s.dawn = 34;
    s.stats = { shards: 118, conversions: 22, refracts: 7, hits: 2, hues: 5 };
    scatter(world, 909, 8, 0, 4);
    for (let i = 0; i < HUES.length; i += 1) {
      burstParticles(s, r, FIELD.cx, FIELD.cy, HUES[i].hex, 18, 200);
    }
    return;
  }

  // defeat (game over)
  s.screen = 'defeat'; s.outcome = 'defeat';
  s.restored = [0, 1]; s.hueIndex = 2; s.hueProgress = 0.44;
  s.score = 4310; s.best = 6120; s.combo = 0; s.refract = 26; s.integrity = 0;
  s.elapsed = 100; s.dawn = 0;
  s.stats = { shards: 61, conversions: 7, refracts: 2, hits: 3, hues: 2 };
  scatter(world, 5150, 7, 8, 2);
  s.player.x = 640; s.player.y = 400;
  burstParticles(s, r, s.player.x, s.player.y, '#ff5470', 24, 160);
}
