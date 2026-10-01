# Contributor and agent guide

These instructions apply throughout this repository. They are canonical for Codex and Claude Code; root `CLAUDE.md` contains only `@AGENTS.md`.

## What this repository is

The independent source, test, and release repository for `@hneudev/flow-player` (MIT). It is a React component that plays scripted steps across a small, supplied architecture graph. [portfolio-4.0](https://github.com/hneudev/portfolio-4.0) is one consumer, not part of this repository.

- **Contract.** [docs/api-contract.md](docs/api-contract.md) is the accepted v0.1 contract. Change it only with owner approval, and record each amendment.
- **Engine.** Engine design and contract clarifications are in [docs/engine.md](docs/engine.md).
- **Task records.** Each milestone has a record in `docs/tasks/` covering scope, decisions, actual verification, and handoff. Follow the current milestone only; later roadmap prompts are not authorization.

## Boundaries

- **No portfolio material.** Never import portfolio aliases, styles, tokens, content, theme providers, routing, or its 3D model. Do not assume Next.js, a router, a root font size, a global reset, or a theme provider.
- **Docs use the public API.** `apps/docs` imports only `@hneudev/flow-player` and its stylesheet. Copyable code lives in `apps/docs/src/snippets/` and is verified by the consumer check; don't paste unverified code into the page.
- **Engine stays neutral.** Keep `src/engine/` free of rendering and of example or host terminology. Examples live in `examples/` and are never published.
- **Published surface.** The package exports only what the contract lists. The `files` allowlist is `dist/`, `README.md`, `LICENSE`, and `CHANGELOG.md`. Reference images in `docs/references/` are conceptual and never shipped.
- **Peer dependencies.** React and React DOM are peers and are never bundled. Add runtime dependencies only with a concrete need and an owner decision.
- **Declarations.** Emitted declarations must type-check for TypeScript 4.9.5 with `@types/react` 18.0.28: no TS 5-only syntax, and no `React.JSX`.
- **Content.** Do not invent claims, users, metrics, or adoption. Label examples as illustrative.

## Setup and checks

- **Runtime.** Use Node 24.17.0 (`.nvmrc`) and npm 11.13.0. Install with `npm ci`.
- **Full check.** `npm run check` runs typecheck, unit tests, build, the docs boundary check, docs typecheck and build, the packed-tarball consumer fixtures (including the documentation snippets), and Chromium/Firefox/WebKit browser checks for the component fixture and the docs site. Install browsers and host libraries with `npx playwright install --with-deps chromium firefox webkit`; report environment failures rather than skipping engines. The fixtures need registry access to install React and TypeScript versions.
- **Individual scripts.** `npm run typecheck`, `npm test`, `npm run build`, and `npm run check:consumers`, which needs a prior build, plus `npm run test:browser` (also requires a build).

## Git and release

- **Remote.** `origin` points to the public `hneudev/flow-player` GitHub repository. Do not push, change visibility, tag, or publish without explicit owner authorization.
- **Publishing guard.** `prepublishOnly` (`scripts/publish-guard.mjs`) rejects folder publishes unless `FLOW_PLAYER_PUBLISH_APPROVED` equals the version. Follow [docs/releasing.md](docs/releasing.md) only after the owner authorizes a specific release; never set the variable on your own.
- **Changes.** Commit only authorized changes, preserve unrelated work, and record actual check results in the task record. Do not present earlier results as new ones.
