# Make-the-best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Dfabra0013/Make-the-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Dfabra0013/Make-the-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Prismwake** is an original browser arcade game: the grey has drained the world of
colour, and you pilot a prism skimmer to restore five lost hues before dawn breaks.
Collect shards of the currently lit hue, trigger a *Refract* burst to convert the dark
Null wisps into shards, dash out of danger with Shift, and manage a short dawn timer.
It has a title screen with rules and controls, a live HUD, a pause screen, a victory
screen and a defeat screen, each with a restart. Its art, palettes, names, procedural
music and sound effects are all its own; it uses no libraries and makes no network
requests.

## Run it

```sh
node serve.ts
```

Then open `http://localhost:8080` in a desktop browser. Or simply serve the `game/`
directory with any static file server and open `game/index.html`.

To rebuild the make.fun deliverables (`game/`, `screenshots/`, `dossier.json`) exactly
as the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The four images under `screenshots/` are real renders of the game's own code, staged
through `?shot=title|play|victory|defeat` and captured in headless Chromium.

## Repository layout

| Path | Job |
| --- | --- |
| `main.ts` | Node 22 entrypoint: copies the game and writes `dossier.json` |
| `vendor/makefun-game.ts` | the kit's dossier library, copied unchanged |
| `game/index.html` | the offline page, loading only modules under `game/` |
| `game/src/config.js` | hues, palette and every tuning constant |
| `game/src/random.js` | seeded PRNG so screenshot scenes repeat |
| `game/src/input.js` | keyboard and pointer input, one-shot actions |
| `game/src/audio.js` | procedural Web Audio music and effects |
| `game/src/world.js` | rules, scoring, hue restoration, win/lose |
| `game/src/spawn.js` | entity spawning and particles |
| `game/src/render.js` | backdrop, nebulae, entities and the skimmer |
| `game/src/hud.js` | spectrum, integrity, dawn, refract and combo HUD |
| `game/src/screens.js` | title, pause, victory and defeat screens |
| `game/src/shots.js` | deterministic screenshot scenes |
| `game/src/main.js` | boot and the fixed-step game loop |
| `serve.ts` | tiny local static server for play-testing |
| `screenshots/` | the four delivered screenshots |

---

Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
