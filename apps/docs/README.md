# flow-player docs and playground

A static Vite + React site that documents `@hneudev/flow-player` and lets visitors play both example flows. It is a private workspace member and is never published to npm.

## Boundaries

- **Public API only.** The site imports `@hneudev/flow-player` and `@hneudev/flow-player/styles.css` and nothing else from the package. The workspace link resolves to the package's built `dist/` through its `exports` map. `npm run check:docs-boundary` fails on any import of package source.
- **Example data.** The site uses the repository's illustrative example flows in [`examples/`](../../examples).
- **Copyable code.** Each copyable example is a real file in [`src/snippets/`](src/snippets), displayed verbatim with Vite's `?raw` import. `npm run check:consumers` type-checks and server-renders the same files in clean installs of the packed tarball. A browser test asserts that the page shows exactly those files.
- **What the package ships.** The package's runtime assets are `dist/` and `styles.css`. Everything here, and the conceptual reference images in [`docs/references/`](../../docs/references), is development material and is not part of the package.

## Local preview

Run from the repository root:

```sh
npm ci
npm run build          # the package; the site consumes its dist/
npm run docs:dev       # development server at http://127.0.0.1:4320/
# or the production build:
npm run docs:build     # writes apps/docs/dist/
npm run docs:preview   # serves apps/docs/dist/ at http://127.0.0.1:4320/
```

Browser checks start their own preview on port 4320 and refuse to reuse a running one. Stop any preview before you run `npm run test:browser`.

## Deployment (instructions only; nothing has been deployed)

The build output in `apps/docs/dist/` is static HTML, JS, and CSS. It has no server code, environment secrets, or API calls, so any static host works.

1. Build the package, then the site:
   - **Served at a domain root:** run `npm run docs:build`.
   - **Served under a subpath:** set the base first, for example `DOCS_BASE=/flow-player/ npm run docs:build` for a GitHub Pages project site.
2. Upload the contents of `apps/docs/dist/`.
3. Check the deployed page: both examples play, the `Copy` buttons work over HTTPS, and there are no console errors.

**Before anything is deployed, the owner must decide two things:**
- **Hosting destination.** Not chosen yet; the earlier task records list it as an open owner decision.
- **Repository visibility.** The source repository is private. GitHub Pages from a private repository requires a paid plan, and makes the site public anyway.

Do not deploy without explicit authorization. If a CI deployment is added later, give it only the deployment permission it needs, and keep credentials out of the repository.
