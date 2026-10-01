# Development and release

## Development

- **Runtime.** Node 24.17.0 (`.nvmrc`) and npm 11.13.0, the same baseline as the portfolio consumer. These are development tools, not a consumer requirement.
- **Workspaces.** The root is a private npm workspace containing only `packages/flow-player`. Development dependencies sit at the root so that one resolution tree serves the package, tests, and examples.
- **Dependency pins.** TypeScript is pinned to 5.9.3, the latest 5.x when this was set up. The library emits declarations that the consumer fixtures check with TS 4.9.5. TypeScript 7 was not adopted for this build. React 18.2.0 and `@types/react` 18.0.28 match the oldest supported consumer. `@types/scheduler` is pinned to 0.16.3 because `@types/react` 18.0.28 imports `scheduler/tracing`, which newer versions removed. The portfolio resolves the same 0.16.3.
- **Tests.** Vitest runs the unit tests from `packages/flow-player/test/` against the TypeScript source. The engine uses an injected fake scheduler, so no test depends on wall-clock time.

## Browser verification and preview

Install browser binaries and native libraries with `npx playwright install --with-deps chromium firefox webkit`. After building, `npm run test:browser` exercises the built exports through an SSR/hydration fixture in all three engines, including keyboard controls, responsive themes, reduced motion, and axe checks. Native library installation may require administrator access. A launch failure is an environment limitation, not a passing test.

`npm run preview:component` serves that internal fixture on port 4310. Stop it before browser checks, which own the same port. See [task 10](docs/tasks/10-accessible-component.md) for actual results and remaining manual verification.

## Build output

`npm run build` cleans `dist/`, then produces:
- `dist/esm/`: ES modules and declarations, for bundlers and `import`;
- `dist/cjs/`: CommonJS and declarations, marked `"type": "commonjs"`, for `require` and legacy resolution;
- `dist/styles.css`: copied from `src/styles.css`.

The top-level `main`, `module`, and `types` fields serve `moduleResolution: node`. The `exports` map serves modern resolvers and exposes `./styles.css`. The entry keeps `'use client'` for App Router hosts.

## Consumer verification

`npm run check:consumers`:
1. Packs the package into a temporary directory and asserts the tarball file allowlist.
2. Installs the tarball into copies of each fixture.
3. Runs the fixture's type-check: TS 4.9.5 under both `node` and `node16`, and TS 5.9 under `bundler`.
4. Server-renders through both the ESM and CJS entries.
5. Checks that every stylesheet selector is `fp-`-scoped and that the package does not bring its own React.

## Release (not yet authorized)

Roadmap prompt 13 covers release. Before any publication:
- The owner confirms npm ownership of the `@hneudev` scope, the GitHub repository and its visibility, the LICENSE copyright line, and the docs hosting destination.
- Run `npm run check` from a clean `npm ci`, review the tarball contents, and update `CHANGELOG.md` and the version.
- Remove the `prepublishOnly` guard only as part of an authorized release.

Do not publish, tag, push, or deploy from routine work.
