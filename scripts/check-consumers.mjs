// Packs @hneudev/flow-player (or takes an existing tarball via --tarball <path>) and installs it
// into isolated consumer fixtures. Packing requires a prior `npm run build`. Uses the npm registry
// for fixture dependencies.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkgDir = join(root, 'packages/flow-player');
const work = mkdtempSync(join(tmpdir(), 'flow-player-consumers-'));
const run = (command, args, cwd, env = {}) =>
  execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', env: { ...process.env, ...env } });

try {
  const given = process.argv.indexOf('--tarball');
  let packed;
  if (given > -1) {
    const source = resolve(process.argv[given + 1]);
    const filename = source.split('/').pop();
    cpSync(source, join(work, filename));
    const files = run('tar', ['-tzf', join(work, filename)], work).trim().split('\n').map(path => ({ path: path.replace(/^package\//, '') }));
    packed = { filename, files, size: readFileSync(source).length };
  } else {
    [packed] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', work], pkgDir));
  }
  const files = packed.files.map(file => file.path).sort();
  for (const required of ['LICENSE', 'README.md', 'CHANGELOG.md', 'package.json', 'dist/styles.css', 'dist/esm/index.js', 'dist/esm/index.d.ts', 'dist/cjs/index.js', 'dist/cjs/index.d.ts', 'dist/cjs/package.json']) {
    assert.ok(files.includes(required), `tarball is missing ${required}`);
  }
  const unexpected = files.filter(file => !/^(dist\/|LICENSE$|README\.md$|CHANGELOG\.md$|package\.json$)/.test(file));
  assert.deepEqual(unexpected, [], 'tarball contains files outside the allowlist');
  const tarball = join(work, packed.filename);
  console.log(`PASS pack: ${packed.filename}, ${files.length} files, ${packed.size} bytes packed`);

  for (const fixture of ['react18-ts49', 'react19-ts5']) {
    const dir = join(work, fixture);
    cpSync(join(root, 'fixtures', fixture), dir, { recursive: true });
    cpSync(join(root, 'fixtures/shared-flow.json'), join(dir, 'shared-flow.json'));
    cpSync(join(root, 'fixtures/ssr.mjs'), join(dir, 'ssr.mjs'));
    run('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock', tarball], dir);
    run('npm', ['run', 'typecheck'], dir);
    const expectedReact = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies.react;
    const out = run('node', ['ssr.mjs'], dir, { EXPECTED_REACT: expectedReact });
    console.log(`PASS ${fixture}: install from tarball, declarations type-check; ${out.trim()}`);

    // Documentation snippets: the exact files the docs display, checked in this clean install.
    cpSync(join(root, 'apps/docs/src/snippets'), join(dir, 'snippets'), { recursive: true });
    cpSync(join(root, 'fixtures/snippets-ssr.cjs'), join(dir, 'snippets-ssr.cjs'));
    const checkConfigs = fixture === 'react18-ts49' ? ['tsconfig.json', 'tsconfig.node16.json'] : ['tsconfig.json'];
    for (const base of checkConfigs) {
      const name = `snippets.${base}`;
      writeFileSync(join(dir, name), JSON.stringify({ extends: `./${base}`, include: ['snippets'] }));
      run('npx', ['tsc', '-p', name], dir);
    }
    writeFileSync(join(dir, 'snippets.emit.json'), JSON.stringify({
      compilerOptions: {
        target: 'es2019', module: 'commonjs', moduleResolution: 'node', jsx: 'react-jsx', strict: true,
        esModuleInterop: true, skipLibCheck: false, rootDir: 'snippets', outDir: 'snippets-out',
      },
      include: ['snippets'],
    }));
    run('npx', ['tsc', '-p', 'snippets.emit.json'], dir);
    console.log(`PASS ${fixture}: ${run('node', ['snippets-ssr.cjs'], dir).trim()} (${checkConfigs.length} resolution mode${checkConfigs.length > 1 ? 's' : ''})`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
