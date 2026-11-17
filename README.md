# Make-the-best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Dfabra0013/Make-the-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Dfabra0013/Make-the-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Chronodial: Shattered Orbit** — a complete top-down arena shooter that runs from one HTML page. Pilot a chrono-skiff around a collapsing astrolabe, tear open **Time-Echoes** that replay your last five seconds as allied clones, gather gold Chrono-Relics between waves, and break the Eclipse Throne's three bosses before the dial runs out. Nine waves, three realms, three bosses, a relic draft, Overdrive, phase-dash, boss phases and an S+ rank to chase.

**Controls** — `WASD` fly · mouse aim · hold left click (or `J`/`Z`) to fire · `Space`/`Shift` phase-dash · `Q` summon a Time-Echo · `F` Overdrive · `1`/`2`/`3` pick a relic · `Esc`/`P` pause · `M` mute · `Enter` confirms.

**Rules** — clear every wave; each one escalates, and waves 3, 6 and 9 end in a realm boss with its own attack phases. Your hull does not refill between waves (shield does), Echoes cost charge and cost you nothing else, and the score comes from kills, crossfire, shard pickups, combo and wave-clear bonuses. Dying ends the run at the summary screen, where `Enter` restarts and `Esc` returns to the loadout.

## Run it

```sh
git clone https://github.com/Dfabra0013/Make-the-best-game.git
cd Make-the-best-game
MAKEFUN_OUTPUT_DIR=out node main.ts   # stages game/ + screenshots/ into out/, writes dossier.json
node serve.ts                         # serves game/ at http://localhost:8080
```

Or open `game/index.html` through any static file server — the game needs no network, no build step and no dependencies. `game/src/` holds the ES modules (config, state, player, enemies, combat, relics, echo, render, hud, screens, audio, input); `./vendor/makefun-game.ts` is the bounty kit's dossier builder, unchanged.

---

Entered on [make.fun](https://make.fun/?ref=dfabra0013&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
