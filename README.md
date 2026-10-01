# flow-player

Development repository for [`@hneudev/flow-player`](packages/flow-player/README.md), an MIT-licensed React component that plays scripted steps across a small, supplied architecture graph.

**Status:** pre-release. Nothing is published, and no remote repository exists.
- **Done:** the scaffold (prompt 08) and the deterministic playback engine (prompt 09).
- **Next:** the accessible visual component (prompt 10) and the docs/playground app (prompt 11).

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
npm run check      # typecheck, unit tests, build, packed consumer fixtures
```

See [AGENTS.md](AGENTS.md) for contributor rules and boundaries.
