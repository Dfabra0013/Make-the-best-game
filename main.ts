// Prismwake — make.fun "Make the best game" entrypoint (Node 22, standard library only).
// The grader runs `node /bot/main.ts` twice with a writable /output; both runs must
// write byte-identical output. We copy the shipped game/ and screenshots/ beside
// this file and rebuild dossier.json with the kit's unchanged library.
//
// Locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSrc = join(here, 'game');
const shotsSrc = join(here, 'screenshots');

mkdirSync(out, { recursive: true });
cpSync(gameSrc, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsSrc)) cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json). Only text_max_bytes shapes the
// dossier text; the rest make this program refuse output the gate would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
