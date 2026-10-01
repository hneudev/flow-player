// Fails if the docs app or examples reach into the package source instead of its public entry points.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const allowedPackages = new Set(['react', 'react-dom/client', '@hneudev/flow-player', '@hneudev/flow-player/styles.css', 'vite']);
const sources = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', 'dist'].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sources(path) : /\.(tsx?|mjs|js)$/.test(entry.name) ? [path] : [];
  });

const problems = [];
let imports = 0;
for (const file of [...sources(join(root, 'apps/docs')), ...sources(join(root, 'examples'))]) {
  const text = readFileSync(file, 'utf8');
  for (const [, specifier] of text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)) {
    imports++;
    const name = relative(root, file);
    if (specifier.startsWith('.')) {
      const target = relative(root, resolve(file, '..', specifier));
      if (target.startsWith('packages')) problems.push(`${name}: relative import into the package (${specifier})`);
      if (!target.startsWith('apps/docs') && !target.startsWith('examples')) problems.push(`${name}: import outside docs/examples (${specifier})`);
    } else if (!allowedPackages.has(specifier.replace(/\?raw$/, ''))) {
      problems.push(`${name}: unexpected import "${specifier}"`);
    }
  }
}
assert.deepEqual(problems, [], 'docs and examples must use only the public package entry points');

// The workspace link must resolve to the built entry points, not to source.
const pkg = JSON.parse(readFileSync(join(root, 'node_modules/@hneudev/flow-player/package.json'), 'utf8'));
assert.equal(pkg.exports['.'].import.default, './dist/esm/index.js');
console.log(`PASS docs boundary: ${imports} imports in apps/docs and examples use only public entry points.`);
