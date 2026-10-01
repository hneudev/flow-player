// After an authorized publish: download the published package from the registry, confirm it is the
// reviewed release candidate, and run the fresh-consumer checks against that registry copy.
// Usage: node scripts/verify-published.mjs <version> <expected sha512 integrity>
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [version, expected] = process.argv.slice(2);
assert.ok(version && expected?.startsWith('sha512-'), 'usage: verify-published.mjs <version> <sha512-integrity>');
const name = '@hneudev/flow-player';
const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'flow-player-published-'));
const npm = args => execFileSync('npm', args, { cwd: work, encoding: 'utf8' });

try {
  const meta = JSON.parse(npm(['view', `${name}@${version}`, '--json']));
  assert.equal(meta.version, version);
  assert.equal(meta.dist.integrity, expected, 'registry integrity differs from the reviewed release candidate');
  const [download] = JSON.parse(npm(['pack', `${name}@${version}`, '--json']));
  const tarball = join(work, download.filename);
  const actual = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`;
  assert.equal(actual, expected, 'downloaded tarball differs from the reviewed release candidate');
  console.log(`PASS registry: ${name}@${version} matches the reviewed artifact (${expected.slice(0, 22)}…)`);
  execFileSync('node', [join(root, 'scripts/check-consumers.mjs'), '--tarball', tarball], { stdio: 'inherit' });
} finally {
  rmSync(work, { recursive: true, force: true });
}
