# flow-player

Development repository for [`@hneudev/flow-player`](packages/flow-player/README.md), an MIT-licensed React component that plays scripted steps across a small, supplied architecture graph.

**Status:** version 0.1.0 is [published on npm](https://www.npmjs.com/package/@hneudev/flow-player) (`npm install @hneudev/flow-player`), tagged [`v0.1.0`](https://github.com/hneudev/flow-player/releases/tag/v0.1.0). [Releasing](docs/releasing.md) describes the release process.
- **Implemented:** scaffold (08), deterministic playback engine (09), accessible visual component (10), and documentation/playground site (11). See [task 10](docs/tasks/10-accessible-component.md) and [task 11](docs/tasks/11-docs-playground.md) for verification and environment limits.
- **Released:** [task 13](docs/tasks/13-release-candidate.md) records the exact artifact, its registry verification and the publication.

## Layout

| Path | Contents |
| --- | --- |
| `packages/flow-player/` | The published package: `src/` (component, `engine/`, `styles.css`), `test/`, and build scripts |
| `apps/docs/` | [Documentation and playground](apps/docs/README.md): a static site that consumes only the public package entry points; never published |
| `examples/` | Two illustrative flows (search, asynchronous publishing), used by tests and the playground; never published |
| `fixtures/` | Isolated consumers that install the packed tarball: React 18.2 + TS 4.9.5, and React 19 + TS 5.9 |
| `scripts/check-consumers.mjs` | Packs the package, checks the file allowlist, installs into each fixture, type-checks, and server-renders |
| `docs/` | [API contract](docs/api-contract.md), [engine design](docs/engine.md), [development and release](CONTRIBUTING.md), [references](docs/references/README.md), task records |

## Quick start

```sh
nvm use            # Node 24.17.0
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run check      # types, unit tests, build, docs boundary and build, packed consumers and snippets, browser journeys
```

See [AGENTS.md](AGENTS.md) for contributor rules and boundaries.

## Previews

- **Documentation and playground:** `npm run build`, then `npm run docs:dev` (or `npm run docs:build && npm run docs:preview`), and open http://127.0.0.1:4320/. Deployment instructions are in [apps/docs/README.md](apps/docs/README.md); nothing is deployed.
- **Component test fixture:** `npm run build`, then `npm run preview:component`, and open http://127.0.0.1:4310/. This is the SSR browser-test fixture.

Stop both previews before browser checks, which own the same ports.
