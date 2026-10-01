// Release-candidate consistency checks. Requires a prior `npm run build`.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');
const pkg = JSON.parse(read('packages/flow-player/package.json'));
const { version } = pkg;

// Identity and publish metadata.
assert.equal(pkg.name, '@hneudev/flow-player');
assert.equal(pkg.license, 'MIT');
assert.equal(pkg.private, undefined, 'the package must not be private');
assert.equal(pkg.publishConfig?.access, 'public', 'scoped packages need public access');
assert.equal(pkg.repository?.url, 'git+https://github.com/hneudev/flow-player.git');
assert.deepEqual(pkg.files, ['dist/', 'README.md', 'LICENSE', 'CHANGELOG.md']);
assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [], 'no runtime dependencies');
assert.match(version, /^\d+\.\d+\.\d+$/, 'release candidates use a plain semver version');

// License text is the same in the repository and the package, and names the confirmed holder.
assert.equal(read('packages/flow-player/LICENSE'), read('LICENSE'));
assert.match(read('LICENSE'), /^MIT License\n\nCopyright \(c\) 2026 Hector Neudert\n/);

// Changelog, docs site and README agree with the version and the verified snippet.
const changelog = read('packages/flow-player/CHANGELOG.md');
assert.equal(changelog.match(/^## (.+)$/m)?.[1], version, 'top changelog entry must be the package version');
assert.ok(!/^## Unreleased/m.test(changelog), 'no Unreleased section in a release candidate');
assert.ok(read('apps/docs/src/App.tsx').includes(version), 'docs site must state the release version');
const readme = read('packages/flow-player/README.md');
const usage = readme.match(/## Usage\n\n```tsx\n([\s\S]*?)\n```/)?.[1];
assert.equal(usage, read('apps/docs/src/snippets/minimal.tsx').trimEnd(), 'README usage must equal the verified minimal snippet');
assert.ok(readme.includes(`## Compatibility (${version})`), 'README must carry the compatibility statement for this version');

// Built output: no source maps or machine-specific paths.
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]));
const dist = walk(join(root, 'packages/flow-player/dist'));
assert.deepEqual(dist.filter(file => file.endsWith('.map')), [], 'no source maps');
for (const file of dist) assert.doesNotMatch(readFileSync(file, 'utf8'), /\/home\/|\/Users\/|[A-Z]:\\\\/, `${file} contains a machine path`);

// Packed file list (dry run; writes nothing).
const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: join(root, 'packages/flow-player'), encoding: 'utf8' }));
assert.equal(packed.filename, `hneudev-flow-player-${version}.tgz`);
console.log(`PASS release: ${pkg.name}@${version}, ${packed.entryCount} files, ${packed.size} bytes packed, ${packed.unpackedSize} unpacked`);
