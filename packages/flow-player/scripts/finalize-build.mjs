// Marks the CommonJS build and copies the stylesheet into the distributed files.
import { copyFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
await writeFile(new URL('cjs/package.json', dist), '{ "type": "commonjs" }\n');
await copyFile(new URL('../src/styles.css', import.meta.url), new URL('styles.css', dist));
