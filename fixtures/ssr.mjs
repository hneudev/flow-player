// Server-renders the packed package through its ESM and CommonJS entries.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { FlowPlayer, validateFlow } from '@hneudev/flow-player';

const require = createRequire(import.meta.url);
const flow = JSON.parse(readFileSync(new URL('./shared-flow.json', import.meta.url), 'utf8'));

assert.deepEqual(validateFlow(flow), []);
const html = renderToString(createElement(FlowPlayer, { flow }));
assert.match(html, /class="fp-root"/);
assert.match(html, /aria-label="Fixture flow"/);
assert.match(html, /Send a request/);

const invalid = renderToString(createElement(FlowPlayer, { flow: { ...flow, edges: [], steps: [{ id: 'x', title: 'X', description: 'X', activeEdges: ['missing'] }] } }));
assert.match(invalid, /This flow could not be displayed/);

const cjs = require('@hneudev/flow-player');
assert.equal(typeof cjs.FlowPlayer, 'function');
assert.match(renderToString(createElement(cjs.FlowPlayer, { flow })), /Answer it/);

const css = readFileSync(require.resolve('@hneudev/flow-player/styles.css'), 'utf8');
assert.match(css, /\.fp-root/);
// Every selector must start with an fp- class: nothing targets html, body, :root, * or bare elements.
const selectors = css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .match(/[^{}]+(?=\{)/g)
  .map(text => text.trim())
  .filter(text => !text.startsWith('@'))
  .flatMap(text => text.split(','))
  .map(text => text.trim());
assert.deepEqual(selectors.filter(selector => !selector.startsWith('.fp-')), [], 'unscoped selectors in stylesheet');

const packageDir = dirname(require.resolve('@hneudev/flow-player/package.json'));
assert.equal(existsSync(join(packageDir, 'node_modules', 'react')), false, 'package must not install its own React');
assert.equal(require('react/package.json').version, process.env.EXPECTED_REACT, 'fixture must use its pinned React');
console.log(`PASS ssr: ESM and CJS render, invalid fallback, stylesheet resolved (${css.length} bytes)`);
