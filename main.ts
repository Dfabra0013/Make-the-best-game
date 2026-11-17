// Submission harness: stages game/ and screenshots/ into the output directory and writes dossier.json.
// Node 22 standard library only; output bytes are a pure function of the repository contents.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, type DossierCaps } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GATE_CAPS: DossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const SCANNABLE_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json']);

function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function copyDirectoryDeterministic(sourceDir: string, targetDir: string): string[] {
  mkdirSync(targetDir, { recursive: true });
  const copied: string[] = [];
  const entries = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => byCodeUnit(a.name, b.name));

  for (const entry of entries) {
    const srcPath = join(sourceDir, entry.name);
    const dstPath = join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copied.push(...copyDirectoryDeterministic(srcPath, dstPath));
    } else if (entry.isFile()) {
      copyFileSync(srcPath, dstPath);
      copied.push(dstPath);
    }
  }
  return copied;
}

function replaceDirectory(sourceDir: string, targetDir: string): string[] {
  if (existsSync(targetDir) && statSync(targetDir).isDirectory()) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  return copyDirectoryDeterministic(sourceDir, targetDir);
}

function assertDirectory(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`Missing ${label} directory at ${path}`);
  }
}

function auditOfflineSources(gameDir: string): string[] {
  const findings: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => byCodeUnit(a.name, b.name))) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && SCANNABLE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        const text = readFileSync(full, 'utf8');
        if (/(?:https?:)?\/\/[a-z0-9-]+\.[a-z]{2,}/i.test(text)) {
          findings.push(relative(gameDir, full));
        }
      }
    }
  };
  walk(gameDir);
  return findings;
}

function auditScreenshots(shotDir: string): string[] {
  const names = readdirSync(shotDir)
    .filter((name) => IMAGE_EXTENSIONS.has(extname(name).toLowerCase()))
    .sort(byCodeUnit);
  if (names.length < 3 || names.length > GATE_CAPS.screenshots.max) {
    throw new Error(`screenshots/ must hold 3 or 4 images, found ${names.length}`);
  }
  for (const name of names) {
    const bytes = statSync(join(shotDir, name)).size;
    if (bytes > GATE_CAPS.screenshots.max_bytes) {
      throw new Error(`screenshots/${name} is ${bytes} bytes, over ${GATE_CAPS.screenshots.max_bytes}`);
    }
  }
  return names;
}

function stageSubmissionArtifacts(repoRoot: string, outputDir: string): Uint8Array {
  const sourceGame = join(repoRoot, 'game');
  const sourceShots = join(repoRoot, 'screenshots');
  assertDirectory(sourceGame, 'playable game');
  assertDirectory(sourceShots, 'screenshot');
  if (!existsSync(join(sourceGame, 'index.html'))) {
    throw new Error('game/index.html is missing: the playable page is the entry point');
  }

  mkdirSync(outputDir, { recursive: true });
  const stagedGame = replaceDirectory(sourceGame, join(outputDir, 'game'));
  const stagedShots = replaceDirectory(sourceShots, join(outputDir, 'screenshots'));

  const externalReferences = auditOfflineSources(join(outputDir, 'game'));
  const shots = auditScreenshots(join(outputDir, 'screenshots'));
  const gameBytes = stagedGame.reduce((total, path) => total + statSync(path).size, 0);

  const dossierBytes = buildDossier(outputDir, GATE_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

  const lines = [
    'chronodial: shattered orbit — staged submission',
    `  game:         ${stagedGame.length} files, ${gameBytes} bytes (limit ${GATE_CAPS.game_max_bytes})`,
    `  screenshots:  ${shots.length} images (${shots.join(', ')})`,
    `  dossier.json: ${dossierBytes.byteLength} bytes, cover ${shots[0]}`,
    `  offline:      ${externalReferences.length === 0 ? 'no external references found' : `WARNING ${externalReferences.join(', ')}`}`,
    `  output root:  ${outputDir}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  if (externalReferences.length > 0) {
    throw new Error(`game/ must run offline, but these files reference an external host: ${externalReferences.join(', ')}`);
  }
  return dossierBytes;
}

stageSubmissionArtifacts(REPO_ROOT, OUTPUT_ROOT);
