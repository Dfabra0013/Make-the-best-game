# Wispwood

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Dfabra0013/Make-the-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Dfabra0013/Make-the-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A nocturne herding game. You are a fox with a lantern on a meadow at dusk, and the
wisps of the wood have lost their way. Sweep the light across them to warm them, walk
them to the arched doorway in the hillside, and get them home before night falls.
Hounds hunt the same meadow; they crouch before they lunge, and a flare of the
lantern's wick buys you the second you need.

Five dusks, each one longer, darker and busier than the last. Survive all five and
you see the dawn.

## Playing it

```sh
npm install          # one dev dependency, only for the screenshot tool
npm run serve        # http://localhost:5173/game/
```

Or open `game/index.html` through any static server — there is no build step, no
import map, and no network request: every import is relative and every asset is in
`game/`. Desktop browser, mouse and keyboard.

| control | what it does |
| --- | --- |
| mouse | points the lantern; the cone pulls wisps toward its axis |
| `WASD` / arrows | walks the fox (the lantern follows at its shoulder) |
| `Shift` | dash — a short, sharp sprint on a cooldown |
| click / `Space` | flare — the cone widens and hounds flee, at a cost in wick |
| `M` | mute |
| `P` / `Esc` | pause |

The HUD carries the dusk's name and its goal, the sand glass to nightfall, hearts,
the wick and the dash, the score, the streak you are on, and whether that score is a
new best (kept in `localStorage` under `wispwood.best`).

## The rules, as they are in the code

- **Warmth.** A wisp in the beam warms up; a warm wisp is *faster*, so a flock you
  have gathered rushes home rather than crawling. Warmth leaks away outside the
  light, which is what makes a wide sweep worth more than a narrow one.
- **The Hollow calls.** The doorway pulls wisps that are already near it, and drifts
  the far ones gently toward itself, so a dusk never strands a wisp in a corner.
- **Hounds.** They stalk, crouch (the tell), lunge, and are `sated` for a couple of
  seconds after a bite — that pause is your opening. Every dusk adds to the pack,
  and the later ones bring the bigger, slower brutes.
- **The lantern is a budget.** Flaring empties the wick; the wick refills slowly. A
  wisp delivered refills a little of it.
- **Charms.** Each dusk home offers a choice of two charms — wider light, a cheaper
  flare, keener scent, more hearts. They stack for the rest of the run.

Scoring rewards the streak: wisps brought home in quick succession multiply, and a
dusk kept with time to spare pays a bonus. Lives are three hearts, plus one for each
dusk survived.

## How the repository is laid out

```
main.ts                     entry point: writes out/ and its dossier
serve.ts                    static server for local play
game/index.html             the shell: one canvas, one module script
game/src/main.js            browser wiring: canvas, input, audio, fixed-step loop
game/src/app.js             WispwoodGame: scenes, the run, the fade between dusks
game/src/run.js             RunState: hearts, score, streak, charms, dusk records
game/src/engine/            rng, draw helpers, particles, input, audio
game/src/data/              dusks.js (the five dusks), charms.js (the charm pool)
game/src/actors/            fox.js, wisp.js, hound.js — the moving bodies
game/src/systems/           lantern.js, flock.js, houndpack.js, hollow.js
game/src/render/            sky.js, meadow.js, actors.js, hud.js, ui.js, layout.js
game/src/scenes/            title.js, play.js, charm.js, results.js
tools/render-shots.mjs      plays the game headlessly and renders screenshots/
tools/autopilot.mjs         the hand the headless runs use
tools/trace-dusk.mjs        one dusk of telemetry, for checking the tuning
screenshots/                four shots of a real session
vendor/makefun-game.ts      the bounty's kit, unchanged
```

Nothing in `game/src/render/` or `game/src/systems/` touches the DOM: the game is a
`WispwoodGame` fed a 2D context, an input state and a clock, which is what lets the
same code be played by `tools/autopilot.mjs` under a headless canvas to produce the
screenshots.

## The screenshots, and how they were taken

`npm run shots` gives a Skia canvas to the real game, plays it with the autopilot,
and writes four JPEGs: the title, the fifth dusk mid-herd, a flare lighting the
flock as the pack breaks, and the dawn screen of a completed run. Each is 1280×800
and under 160 KiB. The same tool prints a headless practice run, which is how the
difficulty was balanced:

```
practice run: 5/5 dusks kept, score 24719, hearts 3, 51 wisps home, ending: dawn
  First Dusk: 5/5 with 44s to spare
  The Long Shadow: 8/8 with 52s to spare
  Whispering Meadow: 10/10 with 33s to spare
  Hound Moon: 13/13 with 85s to spare
  Last Light: 15/15 with 16s to spare
```

`node tools/trace-dusk.mjs 3` prints a dusk's telemetry second by second (flock
distance from the doorway, wisps in the beam, hearts, hounds) when a dusk needs
looking at.

## Handing it in

```sh
node main.ts        # writes out/game, out/screenshots and out/dossier.json
```

`main.ts` copies `game/` and `screenshots/` into `out/` and runs the kit's
`buildDossier` over the result, with the gate's limits as its caps. `vendor/` is not
part of the bundle, and the output directory is emptied first, so running it twice
gives the same bytes.

## Credits

The type is Fraunces and Karla, both under the SIL Open Font License; the licence
texts sit beside the files in `game/assets/fonts/`. Everything else — the meadow,
the fox, the hounds, the Hollow, the sound (synthesised with the Web Audio API) — is
drawn and written for this game. The code is MIT licensed; see `LICENSE`.

---

Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
