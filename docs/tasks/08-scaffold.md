# 08 — Installable package scaffold

## Scope and status

**Done (local only).** On 2026-09-30 the owner accepted the [v0.1 contract](../api-contract.md) as written and authorized prompt 08 together with prompt 09, in `/home/hneud/projects/hneu/flow-player`. The repository was created here with `git init` (branch `main`). No remote, GitHub repository, push, or publication.

**Out of scope, recorded as deferred:**
- the docs/playground app (prompt 11);
- CI workflow and lint configuration (prompt 13 prepares CI; lint can be added with the component work);
- full component behaviour (prompt 10).

## Delivered

- **Workspace.** A private npm workspace root with one package, `packages/flow-player` (`@hneudev/flow-player`, version 0.0.0, MIT). The license names `Hector Neudert`, taken from the Git author. The owner must confirm it before release.
- **Builds.**
  - ESM: `dist/esm`, module ESNext.
  - CJS: `dist/cjs`, module CommonJS, marked `"type": "commonjs"`.
  - Declarations for both, plus `dist/styles.css`.
  - Top-level `main`/`module`/`types` for `moduleResolution: node`, plus an `exports` map with `import`/`require` conditions and `./styles.css`.
  - `'use client'` is preserved in the entry.
- **Packaging.** React and React DOM are peers (`^18.2.0 || ^19.0.0`); `@types/react` is an optional peer (`>=18.0.28`). No runtime dependencies. The `files` allowlist is `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`. A `prepublishOnly` guard blocks publication.
- **Component.** A scaffold-stage `FlowPlayer` that:
  - validates the flow;
  - renders the ready state (nodes, caption) as a labelled `section`;
  - shows the non-throwing invalid-flow fallback (`invalidFlowFallback`, plus an issue list in development builds only);
  - calls `onInvalidFlow` once per invalid content, including under Strict Mode.
- **Styles.** A scoped stylesheet: `fp-` selectors only, `em` sizing, internal `--_fp-*` variables that defer to public `--fp-*` properties, light and dark defaults, and a container query.
- **Consumer fixtures.** `fixtures/react18-ts49` mirrors portfolio-4.0: React 18.2.0, TS 4.9.5, `@types/react` 18.0.28, `moduleResolution: node`, and also `node16`, with `skipLibCheck: false`. `fixtures/react19-ts5` uses React 19.3.0, TS 5.9.3 and `bundler`. `scripts/check-consumers.mjs` installs the packed tarball into each.
- **Documentation.** [AGENTS.md](../../AGENTS.md), [README](../../README.md), [CONTRIBUTING](../../CONTRIBUTING.md) (development and release), the package [README](../../packages/flow-player/README.md), [CHANGELOG](../../packages/flow-player/CHANGELOG.md), and [references](../references/README.md), which copies images 15–17 with their conceptual status.

## Decisions

- **TypeScript.** Development is pinned to TS 5.9.3. TS 7.0.2 was the latest; staying on 5.x keeps declaration emit and the CommonJS/`node10` build stable. The fixtures prove the output against TS 4.9.5.
- **Import specifiers.** Source uses `.js` relative specifiers. With TS 5.9, `rewriteRelativeImportExtensions` would have left `.ts` specifiers in the emitted `.d.ts`, which TS 4.9 consumers cannot resolve; a scratch probe confirmed this. So Node's built-in TypeScript test runner was not used. Vitest 5.0.3 runs the tests instead.
- **Dependency location.** Development dependencies sit at the workspace root. `@types/scheduler` is pinned to 0.16.3, as the portfolio lockfile resolves it, because `@types/react` 18.0.28 needs `scheduler/tracing`.
- **Engine visibility.** The engine is in the tarball (the component imports it), but the `exports` map does not expose it.

## Verification (actual, 2026-09-30, Node 24.17.0 / npm 11.13.0)

| Check | Result |
| --- | --- |
| `npm ci` from a removed `node_modules` | Passed, 49 packages |
| `npm run check` (typecheck, tests, build, consumers) | Exit 0 |
| Tarball | `hneudev-flow-player-0.0.0.tgz`: 42 files, 16,709 bytes packed. Required files present; nothing outside the allowlist (no `src/`, tests, examples, or images) |
| React 18.2 / TS 4.9.5 | Installs from the tarball. Declarations type-check under `node` and `node16` with `skipLibCheck: false`, and the `@ts-expect-error` assertions fire. ESM and CJS server rendering and the invalid fallback work. The stylesheet resolves through `exports`, and every selector is `.fp-`-prefixed. No nested React, and the fixture's own React 18.2.0 is used |
| React 19.3 / TS 5.9.3 | Same checks under `bundler` resolution: passed |
| Earlier failures, fixed | The first pack check failed because the package README was missing, and the selector check was over-broad. Both were fixed before the final run |

**Not verified:**
- browsers and hydration (no client rendering yet);
- latest React 18.3.x (only 18.2.0 and 19.3.0 were exercised);
- the portfolio itself (prompt 12);
- CI on GitHub (no remote).

## Handoff

The local repository is ready to review. Next: [task 09](09-playback-engine.md), delivered together with this task.
