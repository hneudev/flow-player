# flow-player

Development repository for [`@hneudev/flow-player`](packages/flow-player/README.md), an MIT-licensed React component that plays scripted steps across a small, supplied architecture graph.

**Status:** pre-release. The npm package is not published. Source is hosted in the private [hneudev/flow-player](https://github.com/hneudev/flow-player) repository.
- **Implemented:** scaffold (08), deterministic playback engine (09), and accessible visual component (10). See [task 10](docs/tasks/10-accessible-component.md) for verification and environment limits.
- **Next:** the docs/playground app (prompt 11), only when requested.

## Layout

| Path | Contents |
| --- | --- |
| `packages/flow-player/` | The published package: `src/` (component, `engine/`, `styles.css`), `test/`, and build scripts |
| `examples/` | Two illustrative flows (search, asynchronous publishing). Used by tests and later by the playground; never published |
| `fixtures/` | Isolated consumers that install the packed tarball: React 18.2 + TS 4.9.5, and React 19 + TS 5.9 |
| `scripts/check-consumers.mjs` | Packs the package, checks the file allowlist, installs into each fixture, type-checks, and server-renders |
| `docs/` | [API contract](docs/api-contract.md), [engine design](docs/engine.md), [development and release](CONTRIBUTING.md), [references](docs/references/README.md), task records |

## Quick start

```sh
nvm use            # Node 24.17.0
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run check      # types, unit tests, build, packed consumers, browser journeys
```

See [AGENTS.md](AGENTS.md) for contributor rules and boundaries.

## Component preview

Run `npm run build` then `npm run preview:component` and open http://127.0.0.1:4310/. This is the SSR browser-test fixture, not the future docs application. Stop it before browser checks, which own the same port.
