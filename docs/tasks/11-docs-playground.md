# 11 — Documentation and standalone playground

## Scope and baseline

Prompt 11: build documentation and a standalone playground that use only the package's public API. Baseline `78138ff`, clean and in sync with `origin/main` at the start. Nothing was deployed, published, or pushed during this task. Prompt 12 (portfolio integration) is not started.

References:
- [accepted contract](../api-contract.md) and [engine notes](../engine.md);
- tasks [08](08-scaffold.md), [09](09-playback-engine.md) and [10](10-accessible-component.md);
- [contributor instructions](../../AGENTS.md).

## Delivered

### Site

`apps/docs` is a static Vite + React site and a private workspace member, never published. This is the stack recommended before the task; the owner raised no objection. It is one page with these sections:
- playground;
- install;
- minimal usage;
- flow schema (definition, node and edge, step, and limits);
- playback (controls, states, props, ownership, and replacement);
- events and ref handle;
- invalid input;
- styling (custom properties, stable hooks, root-size independence);
- accessibility;
- supported versions;
- limitations;
- troubleshooting.

Prop, label, and custom-property lists were checked against `FlowPlayer.tsx` and `styles.css`, not taken from the contract alone.

### Playground

- **Examples.** Both repository examples. The search example has a query form; a new query replaces the flow by id, and a repeated query restarts it. The publishing example shows the failure tone and the retry.
- **Controls.** The player's own run, pause, step, and reset controls, plus colour-scheme and orientation options.
- **Event log.** A live log fed by `onStepChange`, `onStatusChange` and `onComplete`.
- **Simulation label.** A visible note says no search, publication, or network request happens. Each flow's caption says "Illustrative architecture simulation".

### No duplicated implementation

- **Imports.** The site imports only `@hneudev/flow-player` and `@hneudev/flow-player/styles.css`. The workspace link resolves through the `exports` map to `dist/`.
- **Boundary check.** `scripts/check-docs-boundary.mjs` (`npm run check:docs-boundary`) scans `apps/docs` and `examples`. It fails on any relative import into `packages/` or any unexpected package import, and confirms that the link resolves to `dist/esm`.
- **Proof that it works.** I temporarily added an import of `packages/flow-player/src/engine/playback.js` to the docs; the check failed, naming that import. After reverting, it passed.

### Copyable examples

- **Snippets.** Four self-contained files in `apps/docs/src/snippets/`:
  - `minimal.tsx`;
  - `events.tsx` (ref handle and callbacks);
  - `styling.tsx` (custom properties, scheme, orientation, Spanish labels including `to`);
  - `validation.tsx` (`validateFlow`, fallback, `onInvalidFlow`).

  The page displays them verbatim through `?raw` imports.
- **Clean-install check.** `scripts/check-consumers.mjs` now copies those same files into each clean tarball install. There it:
  1. type-checks them with the fixture's own configuration;
  2. compiles them to CommonJS;
  3. server-renders each one with `fixtures/snippets-ssr.cjs`, which also asserts the validation snippet reports `unknown-edge` and renders its fallback.
- **Browser check.** A browser test asserts that each displayed block equals its source file.

### Independence from the docs app

- **Separate installs.** The packed-tarball consumers install into a temporary directory outside the repository, with no docs app present.
- **Clean tarball.** The tarball allowlist still admits only `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md` and `package.json`, so no docs, examples, snippets, or reference images.
- **No dependency.** The package has no dependency on the site.

### Preview and deployment

[apps/docs/README.md](../../apps/docs/README.md) covers:
- `docs:dev`, `docs:build` and `docs:preview` on port 4320;
- the static output in `apps/docs/dist/`;
- a `DOCS_BASE` subpath option;
- deployment steps, and what the owner must decide first (host; repository visibility versus GitHub Pages).

Root README, AGENTS.md and CONTRIBUTING.md now point to it. Nothing was deployed.

### Docs browser tests

`tests/docs/docs.spec.cjs` has four journeys:
1. **Search example:** run, pause, step, reset, the event log, replacement by a new query, and re-running the same query.
2. **Publishing example:** critical tone, stepping, completion, replay, reset.
3. **Snippets:** displayed snippets equal their source files. The Copy button puts the exact file on the clipboard in Chromium. In Firefox, "Copied" or the explicit failure message is accepted, because clipboard permission differs by engine.
4. **Layout and accessibility:** axe on the whole page in light and dark, and no horizontal overflow at 320, 768 and 1440px.

`playwright.config.cjs` now starts the component fixture (4310) and the docs preview (4320).

## Defects found and fixed during the task

- **Playground timing.** "Run search" originally called `play()` from `requestAnimationFrame`, which can run before the player's effect replaces the flow. It now sets a flag that a parent effect consumes; React runs the player's effects first in the same commit.
- **Duplicate landmark names (axe).** Axe reported `landmark-unique`. All scrollable table regions were named after their first column ("Field table"), and the versions table repeated its section's name. Each table now has a distinct label.

## Verification (actual, 2026-10-01, Node 24.17.0 / npm 11.13.0)

After removing `node_modules`, the package `dist/`, and `apps/docs/dist`:

| Check | Result |
| --- | --- |
| `npm ci` | Passed, 55 packages |
| `npm run typecheck`, `npm test` | 0 errors; 90 tests passed |
| `npm run build` | Passed |
| `npm run check:docs-boundary` | Passed, 29 imports |
| `npm run typecheck -w flow-player-docs`, `npm run docs:build` | 0 errors; built. Rolldown notes that the package's `'use client'` directive is not preserved in the client bundle. That is expected: the directive matters only to React Server Components hosts |
| `npm run check:consumers` | Passed. Tarball 42 files, 21,671 bytes. Both fixtures pass the existing checks plus the four snippets: React 18.2 / TS 4.9.5 under `node` and `node16`; React 19.3 / TS 5.9.3 under `bundler` |
| `npx playwright test --project=chromium --project=firefox` | 20 passed in 42.9s: 6 component journeys and 4 docs journeys in each engine |
| `npx playwright test --project=webkit` | Cannot launch: "Host system is missing dependencies to run browsers." Unchanged from task 10, and not a pass |

I also inspected screenshots of the docs page by eye: desktop light (search example at step 3) and 375px dark (publishing example, stacked vertically, at the failure step).

**Not verified:**
- WebKit/Safari;
- real screen readers;
- a deployed environment (none exists);
- the clipboard outside Chromium beyond the accepted outcomes above.

The single command `npm run check` includes WebKit, so it remains not green on this host.

## Handoff

The changes are committed locally on top of `78138ff` and not pushed. Review:
- the new `apps/docs/`, `tests/docs/`, `scripts/check-docs-boundary.mjs` and `fixtures/snippets-ssr.cjs`;
- the changes to `scripts/check-consumers.mjs`, `playwright.config.cjs`, the root `package.json` (workspaces and scripts) and `package-lock.json`;
- the README, AGENTS and CONTRIBUTING updates, and this record.

**Next milestone:** prompt 12, portfolio integration using the packed tarball. Do not start it automatically.

**Open owner decisions:**
- docs hosting;
- repository visibility;
- npm scope ownership;
- the license copyright line.
