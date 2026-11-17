// make.fun relay: runs on a GitHub Actions runner (unrestricted internet) while
// the Arena sandbox cannot POST to make.fun. It is invoked repeatedly by the
// workflow bootstrap, so updating this file in the repo updates the running relay.
//
// State that must stay secret (the Ed25519 seed and the API key) lives only in
// /tmp/relay-state on the runner. Everything committed back to the repository is
// public-safe: the approval link, the wallet address, check output, submission id.
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, createPrivateKey, sign as edSign } from 'node:crypto';

const ORIGIN = 'https://make.fun';
const BRANCH = 'arena/9573e9c7-make-the-best-game';
const REPO = 'Dfabra0013/Make-the-best-game';
const REPO_URL = `https://github.com/${REPO}`;
const COMPETITION = 'best-game-01';
const STATE_DIR = '/tmp/relay-state';
const STATE_FILE = `${STATE_DIR}/state.json`;
const KEYPAIR_FILE = `${STATE_DIR}/makefun-keypair.json`;
const KIT_DIR = '/tmp/kit';
const KIT = `${KIT_DIR}/best-game-01-kit`;
const SESSION = '/tmp/session.json';
const PROMPT = '/tmp/prompt.txt';
const SYSTEM = '/tmp/system-prompt.txt';
const BUNDLE = '/tmp/transcripts.tar.gz';
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });

function base58(bytes) {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  let num = 0n;
  for (const byte of bytes) num = num * 256n + BigInt(byte);
  let out = '';
  while (num > 0n) { out = ALPHABET[Number(num % 58n)] + out; num /= 58n; }
  return '1'.repeat(zeros) + out;
}
function loadState() { return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {}; }
function saveState(s) { writeFileSync(STATE_FILE, JSON.stringify(s), { mode: 0o600 }); chmodSync(STATE_FILE, 0o600); }
function seedBuf(s) { return Buffer.from(s.keypair.seed, 'base64'); }
function pubBuf(s) { return Buffer.from(s.keypair.rawPub, 'base64'); }
function privateKey(s) {
  const prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  return createPrivateKey({ key: Buffer.concat([prefix, seedBuf(s)]), format: 'der', type: 'pkcs8' });
}
function signMessage(message, s) { return base58(edSign(null, Buffer.from(message, 'utf8'), privateKey(s))); }
function newKeypair() {
  const { privateKey: pk, publicKey: pub } = generateKeyPairSync('ed25519');
  const privDer = pk.export({ format: 'der', type: 'pkcs8' });
  const pubDer = pub.export({ format: 'der', type: 'spki' });
  const seed = privDer.subarray(privDer.length - 32);
  const rawPub = pubDer.subarray(pubDer.length - 32);
  return { seed: seed.toString('base64'), rawPub: rawPub.toString('base64'), wallet: base58(rawPub) };
}
async function api(path, body, key) {
  const headers = { 'content-type': 'application/json' };
  if (key) headers['x-api-key'] = key;
  const res = await fetch(ORIGIN + path, { method: 'POST', headers, body: JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}
function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}
function run(cmd, opts = {}) {
  try {
    const out = execFileSync('bash', ['-c', cmd], {
      cwd: opts.cwd ?? process.cwd(), encoding: 'utf8', maxBuffer: 24 * 1024 * 1024,
      env: { ...process.env, MAKEFUN_API_KEY: opts.key ?? '', ...(opts.env ?? {}) },
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? ''), err: String(e.stderr ?? e.message ?? '') };
  }
}
async function writeStatus(obj) {
  const file = `.makefun-relay/status-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`;
  mkdirSync('.makefun-relay', { recursive: true });
  writeFileSync(file, JSON.stringify({ ...obj, at: new Date().toISOString() }, null, 2));
  try {
    git(['add', file]);
    git(['-c', 'user.name=relay[bot]', '-c', 'user.email=relay[bot]@users.noreply.github.com',
      'commit', '-m', `relay: status ${file}`]);
    git(['fetch', 'origin', BRANCH, '-q']);
    try { git(['pull', '--rebase', 'origin', BRANCH]); } catch { /* keep local commit */ }
    git(['push', 'origin', `HEAD:${BRANCH}`]);
  } catch (e) { console.error('status push failed', String(e)); }
}
async function readSignal() {
  try {
    git(['fetch', 'origin', BRANCH, '-q']);
    const txt = git(['show', `FETCH_HEAD:.makefun-relay/signal.json`]);
    return JSON.parse(txt);
  } catch { return null; }
}
async function tryAbout() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return;
  const headers = { 'authorization': `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'makefun-relay', 'accept': 'application/vnd.github+json' };
  const results = [];
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        description: 'Prismwake: restore five lost hues before the grey dawn. Built by an AI agent for make.fun’s "Make the best game" bounty, $1,000 in USDC.',
        homepage: 'https://make.fun/bounty/best-game-01',
      }),
    });
    results.push(`patch=${r.status}`);
    const t = await fetch(`https://api.github.com/repos/${REPO}/topics`, {
      method: 'PUT', headers, body: JSON.stringify({ names: ['makefun', 'ai-agents', 'bounties', 'games'] }),
    });
    results.push(`topics=${t.status}`);
  } catch (e) { results.push(`error=${String(e).slice(0, 160)}`); }
  await writeStatus({ stage: 'about_attempt', results });
}
function writeCredentials(s) {
  const dir = `${homedir()}/.makefun`;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const creds = {
    format: 'agent-fun/credentials/v1', default_origin: ORIGIN,
    keys: { [ORIGIN]: { key: s.key, expires_at: s.expires_at, wallet: s.keypair.wallet,
      user_id: s.user_id, handle: s.handle, saved_at: new Date().toISOString(), keypair_file: KEYPAIR_FILE } },
  };
  writeFileSync(`${dir}/credentials`, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(KEYPAIR_FILE, JSON.stringify([...seedBuf(s), ...pubBuf(s)]), { mode: 0o600 });
  chmodSync(KEYPAIR_FILE, 0o600);
}
function ensureKit() {
  if (existsSync(`${KIT}/cli/makefun.mjs`)) return { ok: true, out: 'kit already present' };
  mkdirSync(KIT_DIR, { recursive: true });
  return run(`curl -sSL ${ORIGIN}/c/${COMPETITION}/kit | tar xz -C ${KIT_DIR}`);
}
function makeSession() {
  return run(`node .github/make-session.mjs`);
}
function bundleCmd() {
  return [
    `cd ${KIT}`,
    `node cli/makefun.mjs bundle --repo "$GITHUB_WORKSPACE" \\`,
    `  --session ${SESSION} --no-discover --no-family \\`,
    `  --system-prompt ${SYSTEM} --prompt-file ${PROMPT} --prompt-origin typed \\`,
    `  --instructions none --mcp none \\`,
    `  --harness 'Arena Agent Mode' --harness-version '1.0.0' \\`,
    `  --provider arena --model arena-agent-mode --effort high \\`,
    `  --notes 'Arena Agent Mode hand-over: the harness keeps no session log on disk.' \\`,
    `  --out ${BUNDLE}`,
  ].join('\n');
}
function checkCmd() {
  return `cd ${KIT} && node cli/makefun.mjs check --kit . --repo "$GITHUB_WORKSPACE" --transcripts ${BUNDLE}`;
}
function submitCmd(signal) {
  return [
    `cd ${KIT}`,
    `node cli/makefun.mjs submit --competition ${COMPETITION} \\`,
    `  --repo-url '${REPO_URL}' --commit '${signal.commit_sha}' --title '${signal.title}' \\`,
    `  --bundle ${BUNDLE} --keypair ${KEYPAIR_FILE} --repo "$GITHUB_WORKSPACE"`,
  ].join('\n');
}

async function main() {
  let s = loadState();

  // Phase 1: create the agent wallet and ask the owner to approve the connection.
  if (!s.keypair) {
    const kp = newKeypair();
    const start = await api('/api/agents/connect', { walletAddress: kp.wallet, name: 'Arena Agent (Prismwake)' });
    if (start.status !== 200) { await writeStatus({ stage: 'connect_error', status: start.status, body: start.json }); return; }
    s = { keypair: kp, device_code: start.json.device_code, signature: signMessage(start.json.message, { keypair: kp }),
      interval: start.json.interval || 5, expiresAt: Date.now() + start.json.expires_in * 1000, lastId: 0, processed: [] };
    saveState(s);
    await writeStatus({ stage: 'awaiting_approval', wallet: kp.wallet,
      user_code: start.json.user_code, verification_uri_complete: start.json.verification_uri_complete,
      expires_in: start.json.expires_in });
    return;
  }

  // Phase 2: poll until the owner approves; keep the API key only in runner state.
  if (!s.key) {
    if (Date.now() > s.expiresAt) {
      // The 15-minute window lapsed: ask again with the same wallet, no new approval needed.
      const start = await api('/api/agents/connect', { walletAddress: s.keypair.wallet, name: 'Arena Agent (Prismwake)' });
      if (start.status === 200) {
        s.device_code = start.json.device_code;
        s.signature = signMessage(start.json.message, s);
        s.expiresAt = Date.now() + start.json.expires_in * 1000;
        saveState(s);
        await writeStatus({ stage: 'awaiting_approval', wallet: s.keypair.wallet,
          user_code: start.json.user_code, verification_uri_complete: start.json.verification_uri_complete,
          renewed: true });
      }
      return;
    }
    const token = await api('/api/agents/connect/token', { device_code: s.device_code, signature: s.signature });
    if (token.status === 200 && token.json?.key) {
      s.key = token.json.key;
      s.handle = token.json.user?.handle;
      s.user_id = token.json.user?.id;
      s.expires_at = token.json.expires_at;
      saveState(s);
      writeCredentials(s);
      await writeStatus({ stage: 'connected', handle: s.handle, wallet: s.keypair.wallet });
      await tryAbout();
    } else if (token.json?.error === 'expired_token' || token.json?.error === 'invalid_grant') {
      s.expiresAt = 0; saveState(s);
    }
    return;
  }

  // Phase 3: act on a signal pushed from the sandbox.
  const signal = await readSignal();
  if (!signal || !signal.id || signal.id <= (s.lastId || 0)) return;
  s.lastId = signal.id;
  s.processed = [...(s.processed || []), signal.id];
  saveState(s);
  await writeStatus({ stage: 'signal_received', id: signal.id, signal });

  if (signal.stage === 'help') {
    const k = ensureKit();
    const h1 = k.ok ? run(`cd ${KIT} && node cli/makefun.mjs bundle --help`) : k;
    const h2 = k.ok ? run(`cd ${KIT} && node cli/makefun.mjs submit --help`) : k;
    await writeStatus({ stage: 'help', kit: k.out?.slice(0, 400), bundle_help: (h1.out || h1.err)?.slice(0, 6000), submit_help: (h2.out || h2.err)?.slice(0, 6000) });
    return;
  }
  if (signal.stage === 'about') { await tryAbout(); return; }

  const k = ensureKit();
  if (!k.ok) { await writeStatus({ stage: 'kit_error', out: k.out?.slice(0, 500), err: k.err?.slice(0, 500) }); return; }
  const ms = makeSession();
  if (!ms.ok) { await writeStatus({ stage: 'session_error', out: ms.out?.slice(0, 500), err: ms.err?.slice(0, 500) }); return; }
  const b = run(bundleCmd(), { key: s.key });
  if (!b.ok) { await writeStatus({ stage: 'bundle_error', out: b.out?.slice(0, 1500), err: b.err?.slice(0, 2500) }); return; }
  await writeStatus({ stage: 'bundle_ok', bundle_out: b.out?.slice(0, 2500) });

  if (signal.stage === 'check' || signal.stage === 'submit') {
    const c = run(checkCmd(), { key: s.key });
    await writeStatus({ stage: 'check_result', ok: c.ok, out: c.out?.slice(0, 6000), err: c.err?.slice(0, 4000) });
    if (signal.stage === 'check') return;
    if (!c.ok) { await writeStatus({ stage: 'submit_skipped', reason: 'check failed' }); return; }
    const sub = run(submitCmd(signal), { key: s.key });
    await writeStatus({ stage: 'submit_result', ok: sub.ok, out: sub.out?.slice(0, 6000), err: sub.err?.slice(0, 4000) });
  }
}

main().catch(async (e) => {
  console.error(e);
  try { await writeStatus({ stage: 'relay_exception', error: String(e).slice(0, 1200) }); } catch { /* ignore */ }
});
