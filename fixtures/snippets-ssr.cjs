// Server-renders every documentation snippet, compiled from the docs app's source files,
// against the package installed from the packed tarball.
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { createElement } = require('react');
const { renderToString } = require('react-dom/server');

// Snippets import the stylesheet as a bundler would; Node has no CSS loader, so treat it as empty.
require.extensions['.css'] = () => {};

const out = join(__dirname, 'snippets-out');
const names = readdirSync(out).filter(name => name.endsWith('.js')).sort();
assert.ok(names.length >= 4, `expected the documentation snippets, found ${names.length}`);
for (const name of names) {
  const snippet = require(join(out, name));
  assert.equal(typeof snippet.default, 'function', `${name} must default-export a component`);
  const html = renderToString(createElement(snippet.default));
  assert.match(html, /class="fp-root"/, `${name} must render the player`);
  if (name === 'validation.js') {
    assert.ok(snippet.issues.some(issue => issue.severity === 'error' && issue.code === 'unknown-edge'), 'validation snippet reports the missing edge');
    assert.match(html, /The diagram is unavailable/);
  }
}
console.log(`PASS snippets: ${names.map(name => name.replace(/\.js$/, '')).join(', ')} type-check and server-render`);
