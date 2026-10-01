# 09 — Deterministic playback engine

## Scope and status

**Done (local only).** This task implements the rendering-independent playback engine from the accepted [contract](../api-contract.md) in `packages/flow-player/src/engine/`, with tests and two example flows. The component does not use the engine for playback yet; prompt 10 connects them. No remote, push, or publication.

## Delivered

- **Data model.** Supplied nodes in lane order, directional edges (`from`/`to`), and scripted steps, each with:
  - title and description;
  - active nodes and edges;
  - tone;
  - carried-forward node details;
  - per-step edge labels;
  - optional duration.
- **`validateFlow`** (public). Errors and warnings with codes and paths, covering:
  - types;
  - limits;
  - empty and duplicate ids;
  - unknown references in edges, `activeNodes`, `activeEdges`, `nodeDetails` and `edgeLabels`;
  - self-loops and non-adjacent edges;
  - parallel-edge and active-edge caps;
  - enum values and durations;
  - long text;
  - steps with no activity.
- **`deriveFrame`.** Node and edge `pending`/`active`/`completed` state, details, labels and tone from one step index, so they stay synchronized. Edge direction is semantic (`forward`/`backward` by lane order) and never comes from layout.
- **`transition`.** The pure state table for ready, playing, paused and completed, covering play (including resume and replay), pause, next, previous, select (`goTo`), reset and timer.
- **`createPlayback`.** Owns the following behaviour:
  - a single timer with an injectable scheduler;
  - remaining dwell on pause, and per-step and player durations;
  - identity replacement and same-id updates, including clamping and equivalent-content detection;
  - invalid data (the flow is disabled until valid data returns);
  - autoPlay and reduced-motion behaviour;
  - `connect`/`disconnect` for mount, unmount and Strict Mode;
  - warnings for ignored commands and options.
- **`describeTransition`.** Orders events as step, then status, then complete, with causes.
- **Examples.**
  - [`examples/search.ts`](../../examples/search.ts): `createSearchFlow(query)`. Three nodes; the request goes forward and the response comes back. It uses a fixed fictional index, and the id `search:<query>`, so a new query replaces the flow.
  - [`examples/publishing.ts`](../../examples/publishing.ts): five nodes. The API acknowledges early while a build is queued, the render fails, a retry succeeds, and the last step has no edge.

Both examples are labelled illustrative and are not published. The engine source contains no example or host terminology; a grep for `search`, `portfolio`, and `query` in `src/` returns nothing.

Design notes and nine clarifications where the contract was silent (for example, `next` at the last step, autoPlay replacement, and same-id update events) are in [docs/engine.md](../engine.md).

## Tests

90 Vitest tests in `packages/flow-player/test/`, all using a manual fake clock:

| File | Covers |
| --- | --- |
| `machine.test.ts` | Every row of the contract transition table, no-op identity, invalid selections, and single-step flows |
| `playback.test.ts` | Timed advance and completion; per-step and clamped durations; no duplicate loops; replay; pause/resume keeping the remaining dwell; full dwell after navigating; reset during playback; both boundaries; `goTo` validation; event order and causes; no events on mount or no-op; replacement (with and without autoPlay); equivalent-content no-op; same-id update with clamping and completion rules; invalid then valid data; reduced motion (autoPlay ignored, `preference` pause); duration changes; `defaultStepIndex` reset; no timers before `connect`; Strict Mode reconnect and timer cleanup on disconnect |
| `validate.test.ts` | Every error and warning code, with paths |
| `frame.test.ts` | Synchronized node and edge state, reuse of elements, semantic direction, detail carry-forward and clearing, per-step labels, and tone |
| `examples.test.ts` | Both examples are valid with no warnings. Forward and backward edges per step; synchronized details and labels; search replacement by query; the no-match variant; publishing concurrency, failure and retry; clearing details; deterministic completion |

**Mutation check.** I temporarily broke resume so it ignored the remaining dwell; 2 tests failed. Separately, I removed the clearing of the previous timer before scheduling; 1 test failed. Both were reverted, and all 90 tests pass again.

## Verification (actual, 2026-09-30, Node 24.17.0 / npm 11.13.0)

| Check | Result |
| --- | --- |
| `npm run typecheck` (source, tests, examples; TS 5.9.3, strict, `noUncheckedIndexedAccess`) | 0 errors |
| `npm test` | 5 files, 90 tests passed |
| `npm run check` after a clean `npm ci` | Exit 0, including build and both packed consumer fixtures (see [task 08](08-scaffold.md)) |

**Not verified:** real browsers, real timers, React integration of the engine (prompt 10), and GitHub CI (no remote exists).

## Handoff

Review the whole local repository; it has no earlier baseline. Prompt 10 should:
- create the controller once per component instance;
- call `connect`/`disconnect` from the mount effect;
- call `setFlow` when `flow` changes, plus `setStepDuration` and `setReducedMotion` from props and the media query;
- forward `describeTransition` events to `onStepChange`, `onStatusChange` and `onComplete`;
- render from `getFrame()`;
- map semantic edge direction to the current orientation.

The engine stays internal unless the owner decides to expose it.
