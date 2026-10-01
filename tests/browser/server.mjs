import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
const server = await createServer({ server: { host: '127.0.0.1', port: 4310, strictPort: true }, appType: 'custom' });
server.middlewares.use(async (req, res, next) => {
  if (req.url?.split('?')[0] !== '/') return next();
  try {
    const options = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
    const { Fixture } = await server.ssrLoadModule('/tests/browser/App.tsx');
    const html = await server.transformIndexHtml(req.url, `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flow player checks</title><style>html {font-size:${options.small ? '62.5%' : '100%'}}body {font-family:Arial,sans-serif;font-size:${options.small ? '1.6rem' : '1rem'};margin:16px}main {max-width:1400px;margin:auto}#second {margin-top:2em}${options.reset ? '*{margin:0;padding:0}button{font-family:inherit}a{color:inherit}:focus-visible{outline:1px dotted rgb(255, 0, 0);outline-offset:0}' : ''}</style></head><body><div id="app">${renderToString(createElement(Fixture, { options }))}</div><script type="module" src="/tests/browser/client.tsx"></script></body></html>`);
    res.setHeader('Content-Type', 'text/html'); res.end(html);
  } catch (error) { server.ssrFixStacktrace(error); next(error); }
});
await server.listen();
