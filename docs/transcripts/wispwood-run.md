# Wispwood — run record

Entry for **make.fun · best-game-01 (“Make the best game”)**, account `@dfabra0013`.
This file is the transcript bundle's run record: what the agent was asked for, the
order it did the work in, the decisions it made, and the checks it ran. It is written
from the session itself, as the bounty's `transcripts_run_record` asks.

## The brief

Read `make.fun/skill.md` and the bounty's requirements, build a game to the bounty's
deliverable contract (a Node 22 `main.ts` at the root, an unchanged
`vendor/makefun-game.ts`, everything playable under `game/`, three or four
screenshots, transcripts), and enter it. The person's own words, kept as they gave
them: *be fully autonomous — don't stop until the repo is finished to win the
tournament, and do the best code according to the judges' criteria.*

Judged criteria, in the order the bounty states them: a complete game (title, play,
HUD, win and lose, restart, all visible in the screenshots), fun and depth, feel and
polish, look and originality, and structure — file and function names matter.

## The shape of the run

1. **Read the contract first.** `make.fun/skill.md`, then
   `/api/competitions/best-game-01/requirements` in full: the harness
   (`program/v1`), the gate (`game_files`, `references`, `screenshots`,
   `dossier_matches`, `js_parses`), the judge (`superbot.gg`, high effort, a
   `dossier-view/v1` dossier of a 768×480 contact sheet and a short source outline),
   the intake checks that apply (`repo_readme`, `repo_about`), and
   `how_to_submit`.
2. **Worked out what the sandbox can do.** No make.fun connectivity from the shell
   (every variant of the host answers 000 there; only a page fetch reaches it), no
   headless browser (Chromium's `libnss3` and the system fonts are absent), but Node
   22.22, `gh` authenticated as `Dfabra0013`, and GitHub, npm and PyPI reachable. So:
   no DOM for the game's logic, no browser for the screenshots.
3. **Chose a rendering strategy that survives that.** The kit's `@napi-rs/canvas`
   gives a Skia 2D context without a DOM. The game was therefore written so that
   every system and every renderer is DOM-free — `WispwoodGame` takes a context, an
   input state and a clock — and only `game/src/main.js` touches `document`,
   `window`, `localStorage` and the Web Audio API. The screenshots come out of the
   *same* code the browser runs, drawn on Skia and encoded as JPEG.
4. **Built the game.** `Wispwood`: a fox with a lantern herds wisps across a meadow
   at dusk and brings them to an arched doorway in the hillside, while hounds hunt
   the same ground. Five dusks, three hearts, charms between dusks.
5. **Balanced it against a headless hand.** `tools/autopilot.mjs` plays a dusk the
   way a person does; `tools/trace-dusk.mjs` prints telemetry; `npm run shots` plays
   whole runs and prints a scoreboard.
6. **Drew it, then looked at what it drew.** Each render was opened and corrected:
   the HUD collided with long dusk names, the meadow read as falling rain, the
   Hollow read as a tombstone, the fox dissolved into its own lantern light.
7. **Wrote the entry down.** `main.ts` → `out/` with `dossier.json`; `serve.ts` for
   local play; README with the bounty's three badges; this record.

## Decisions worth keeping

- **The lantern is the verb.** Every other mechanic hangs off one idea: the light is
  a cone you *aim*, and warmth is the thing that makes a wisp willing. Aiming wide
  gathers more and moves them less; aiming tight moves a few quickly. That is the
  whole game in one gesture, and it is legible in a still image.
- **Wisps speed up as they warm.** The first version had warm wisps drift politely.
  Reversing it — warm wisps are *eager* — turned herding from pushing a crowd into
  leading a flock, and it is what made the later dusks winnable without timers that
  felt unfair.
- **The fox stands on the Hollow's side of the flock.** The autopilot's first design
  pushed the flock from behind; the flock could not keep up and every dusk failed.
  Standing between the flock and the door and backing toward it fixed the run. That
  discovery is now the tutorial-by-doing of the game itself.
- **Hounds telegraph, then commit.** Crouch, lunge, recover, and a `sated` pause
  after a bite. The pause is a gift to the player and makes the pack feel alive
  rather than homing.
- **A gate in the doorway, then no gate.** Wisps filing into the Hollow one at a
  time looked better and cost the run too much time; the one-per-frame cap keeps a
  beat between deliveries and the streak still climbs.
- **Screenshots from a real session, not posed.** The shot tool runs the game and
  picks the best frame by a quality function (wisps in the beam, spread across the
  meadow, a hound close enough to matter). The dawn shot is the results screen of a
  run that actually reached dawn.

## Checks run

- `MAKEFUN_OUTPUT_DIR=out node main.ts` twice in a row: identical `dossier.json`,
  `805685218673d2cacf255800e6db288808153e18887191c0e8b897f41104589e`,
  877,677 bytes (the gate caps it at 1.5 MiB). The dossier's text is 159,580 bytes
  (cap 163,840); it describes 29 source files and 4 woff2 faces, 0 vendored files.
- Gate shape: `out/game` 312 KiB over 35 files (cap 993 files / 48 MiB), every
  reference inside `game/` and relative — no `http(s)` anywhere in the game sources,
  no import map, no bare specifier. Four screenshots, all 1280×800 JPEG under
  160 KiB (cap 256 KiB, long side ≤ 1280, short side ≥ 480).
- `npm run shots` (the practice run, printed at the end of the tool):

  ```
  practice run: 5/5 dusks kept, score 24719, hearts 3, 51 wisps home, ending: dawn
    First Dusk: 5/5 with 44s to spare
    The Long Shadow: 8/8 with 52s to spare
    Whispering Meadow: 10/10 with 33s to spare
    Hound Moon: 13/13 with 85s to spare
    Last Light: 15/15 with 16s to spare
  ```

- `node serve.ts` on a spare port: `/game/` and `/game/src/main.js` 200,
  `.woff2` served as `font/woff2`, a traversal attempt 404.
- `node --input-type=module -e "import('./game/src/render/actors.js')"` after each
  redraw, to catch a broken render module before a run does.

## What is left to the person

The sandbox cannot reach make.fun, so the login and the final POST happen on a
machine that can. `npx makefun login` (or the agent-connect flow in `skill.md`) mints
the `x-api-key`, then the submission is one multipart POST to
`/api/competitions/best-game-01/submissions` with `repo_url`, `commit_sha`, `bundle`,
`transcripts`, `title`, `entry_message` and `entry_signature` — the entry message
signed with the account's key, per the template in the requirements.
