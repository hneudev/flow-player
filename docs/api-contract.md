<!--
Canonical library copy of the accepted v0.1 contract. Source: hneudev/portfolio-4.0
docs/tasks/07-library-contract.md at b235e94 (accepted by the owner 2026-09-30).
From here on, amend this file in the library repository; the portfolio copy is historical.
Clarifications made during implementation are listed in docs/engine.md.
-->
# flow-player v0.1 API contract (accepted)


## Owner decisions (resolved 2026-09-30)

| Decision | Owner answer | Notes |
| --- | --- | --- |
| Framework scope | **React-first** | One React package. Playback logic stays framework-neutral internally, but no separate core package or other adapters are promised. |
| Package name | **`@hneudev/flow-player`** | Repository name: `hneudev/flow-player`. |
| License | **MIT** | |
| Local directory | **`/home/hneud/projects/hneu/flow-player`** | Sibling of `hneu-dev`, `hneu-blog`, `hneu-pro`. Not created. |

Checked 2026-09-30: `npm view @hneudev/flow-player` and `npm view flow-player` both returned 404, so neither name is currently published. The local directory does not exist.

Still unverified, and must be confirmed before prompt 13 (release). Prompt 08 does not need them:

- Whether an npm user or organization named `hneudev` exists and is owned by the owner. A 404 for the package does not prove scope ownership.
- Whether the GitHub name `hneudev/flow-player` is free, and the repository's visibility when created.
- The copyright holder line in `LICENSE`. The proposal is `Copyright (c) 2026 Hector Neudert`, taken from the local Git author name. The owner must confirm it.
- The hosting destination for the docs/playground.

## Product definition (*Proposal*)

`FlowPlayer` renders a small, supplied process graph and plays supplied explanatory steps along explicit directional edges. It explains a flow; it does not observe or run one.

**In v0.1:** a linear lane of 2–6 nodes; directional edges between adjacent nodes in both directions; deterministic scripted steps; step-associated text details on nodes and edges; built-in playback controls; horizontal/vertical layout based on the container; light and dark default themes; CSS-variable theming; a pure `validateFlow` function.

**Excluded from v0.1:**
- graph editing or drag-and-drop;
- automatic layout of arbitrary graphs, branches, or non-adjacent edges;
- automatic code or DOM inspection;
- real telemetry, tracing, or network capture;
- backend execution, authentication, or persistence;
- rich/HTML content inside flow data;
- loops, playback speed control, and a fully controlled playback mode;
- other framework adapters or a separate core package.

**Why a linear lane:** both example flows and the references fit it. Adjacent-only edges let connectors sit between node cells in pure CSS. That keeps the server-rendered markup identical to the client markup and avoids layout measurement. Branching layouts should be reconsidered only when a real consumer needs one.

## Public inputs (*Proposal*)

All flow data is plain, serializable data. Strings render as text, never as HTML.

```ts
export interface FlowDefinition {
  id: string;                 // identity; changing it counts as replacement (see Playback)
  title: string;              // accessible name of the player
  caption?: string;           // e.g. "Illustrative architecture simulation"
  nodes: FlowNode[];          // lane order = array order
  edges: FlowEdge[];
  steps: FlowStep[];
}

export interface FlowNode {
  id: string;
  label: string;              // "Handle the request"
  kind?: string;              // eyebrow, e.g. "Server"
  meta?: string;              // footer, e.g. "Node.js API" (illustrative)
}

export interface FlowEdge {
  id: string;
  from: string;               // node id; direction comes from data, never screen position
  to: string;                 // must be adjacent to `from` in lane order
  label?: string;             // "Search query"
}

export interface FlowStep {
  id: string;
  title: string;              // "Matches found"
  description: string;        // "What is happening" text
  activeNodes?: string[];
  activeEdges?: string[];
  tone?: 'default' | 'critical';          // e.g. a failed job
  nodeDetails?: Record<string, FlowNodeDetail | null>; // null clears a carried-forward detail
  edgeLabels?: Record<string, string>;    // per-step label, e.g. "3 matching records"
  durationMs?: number;                     // overrides stepDurationMs for this step
}

export interface FlowNodeDetail {
  badge?: string;                                  // "3 matches found"
  note?: string;                                   // "Waiting for results"
  items?: { label: string; state?: 'pending' | 'active' | 'done' }[];
}
```

**Derived state (deterministic, from the current step index):**
- *Edges:* `active` if listed in the current step; `completed` if listed in any earlier step; otherwise `pending`.
- *Nodes:* follow the same rule using `activeNodes`.
- *Node details:* show the most recent `nodeDetails` entry at or before the current step, until an entry sets it to `null`.
- *Edge labels:* show the current step's `edgeLabels` override, otherwise the edge's `label`.

**Component props:**

| Prop | Type / default | Purpose |
| --- | --- | --- |
| `flow` | `FlowDefinition` (required) | Graph and script |
| `defaultStepIndex` | `number`, default `-1` (ready) | Initial position; affects server-rendered markup |
| `autoPlay` | `boolean`, default `false` | Starts on mount. Ignored under reduced motion |
| `stepDurationMs` | `number`, default `2400` | Dwell time per step; clamped to 800–20000 |
| `orientation` | `'auto' \| 'horizontal' \| 'vertical'`, default `'auto'` | `auto` uses the container width, not the viewport |
| `colorScheme` | `'light' \| 'dark' \| 'system'`, default `'system'` | Selects default palette; never reads or writes document theme |
| `reducedMotion` | `'user' \| 'always'`, default `'user'` | `always` forces the static presentation; the user preference cannot be overridden to *more* motion |
| `labels` | `Partial<FlowPlayerLabels>` | UI strings (Play, Pause, Resume, Replay, Previous, Next, Reset, "Step {n} of {total}", legend, status) for localization |
| `invalidFlowFallback` | `ReactNode` | Replaces the default invalid-flow notice |
| `className`, `style`, `id` | standard | `id` seeds instance IDs; otherwise `useId` |
| `onStepChange`, `onStatusChange`, `onComplete`, `onInvalidFlow` | callbacks | See Events |

The imperative handle is exposed through `ref` (`forwardRef`, so it works with React 18 and 19):

```ts
export interface FlowPlayerHandle {
  play(): void; pause(): void; next(): void; previous(): void;
  goTo(stepIndex: number): void; reset(): void;
  getState(): { status: PlaybackStatus; stepIndex: number };
}
```

Surrounding content stays with the consumer: page headings, a "What this demonstrates" panel, the search input, and source links.

## Events (*Proposal*)

Callbacks fire after the state is committed (from an effect), never during render. Each fires at most once per transition.

```ts
type PlaybackStatus = 'ready' | 'playing' | 'paused' | 'completed';
type ChangeCause = 'play' | 'pause' | 'timer' | 'next' | 'previous' | 'select' | 'reset' | 'replace' | 'update' | 'preference';

onStepChange?(e: { stepIndex: number; previousStepIndex: number; step: FlowStep | null; cause: ChangeCause }): void;
onStatusChange?(e: { status: PlaybackStatus; previousStatus: PlaybackStatus; cause: ChangeCause }): void;
onComplete?(e: { flowId: string; cause: ChangeCause }): void;
onInvalidFlow?(issues: FlowIssue[]): void;   // once per invalid flow id/content
```

Events report changes only. Handle commands use the same cause as their corresponding UI commands; `goTo` uses `select`. For a transition that changes both index and status, emit `onStepChange`, then `onStatusChange`, then `onComplete` if newly completed. No-op commands emit nothing. Mount emits no change events; consumers can derive initial display from `defaultStepIndex`. Strict Mode effect replay must not duplicate transition events. A consumer can keep external UI in sync with the current step (the roadmap's "labels and displayed results stay synchronized" requirement) by reading `step` from `onStepChange`.

## Playback ownership and state transitions (*Proposal*)

**The component owns playback state in v0.1.** Consumers observe it through events and command it through the ref handle. A fully controlled `stepIndex`/`status` mode is deferred. Controlled playback would split the timer and the index between two owners, and neither the portfolio nor the playground needs it. Reconsider if a consumer requires it.

Position is `stepIndex ∈ [-1, n-1]`, where `-1` means "ready" and nothing is active. `n` is the number of steps.

| Command | ready (−1) | playing (k) | paused (k) | completed (n−1) |
| --- | --- | --- | --- | --- |
| play | playing(0) | no-op | playing(k), remaining dwell kept | playing(0) (replay) |
| pause | no-op | paused(k) | no-op | no-op |
| next | paused(0)¹ | paused(k+1)¹ | paused(k+1)¹ | no-op |
| previous | no-op | paused(k−1), or ready if k=0 | paused(k−1), or ready if k=0 | paused(n−2), or ready if n=1 |
| goTo(i) / select | paused(i)¹ | paused(i)¹ | paused(i)¹ | paused(i)¹ |
| reset | no-op | ready | ready | ready |
| timer elapses | — | playing(k+1); after the last step's dwell → completed | — | — |

¹ Landing on the last step by a manual command gives `completed`. Manual navigation during playback pauses it. `goTo(-1)` always returns to ready; selecting the current step while playing pauses at that step without emitting an index-change event. Selecting it while already paused/completed is a no-op. Selecting an earlier step clears completion; replay/reset recomputes all derived state from the new index, without keeping stale completed nodes or details.

**Rules:**
- A non-integer or non-finite `goTo`, or a value outside `[-1, n-1]`, is ignored with a development warning.
- There is exactly one pending timer per instance. Each command clears it before scheduling, so repeated `play()` cannot create duplicate loops.
- Timers are cleared on unmount and on replacement.
- Timing uses an injectable scheduler inside the engine so tests are deterministic. The scheduler is not public API in v0.1.
- Advancing never waits for animation or transition callbacks.
- **Replacement.** A change to `flow.id` is a replacement: clear the timer, return to ready (or playing(0) if `autoPlay` applies), and emit events with cause `replace`. The search example uses this, for example `id: "search:" + query`. Treat input objects as immutable: changed content must arrive in a new reference. If content changes but `id` stays the same, re-validate, clear the old timer, and recompute all derived state. Keep the index if in range; otherwise clamp it. Preserve ready at −1; preserve playing with a fresh full dwell for the selected step (including the last step); preserve paused. A completed flow stays completed only if its index is still the last step; otherwise it becomes paused. Emit changed index/status with cause `update`. A new but equivalent object does not reset playback. Changes to `defaultStepIndex` after mount are ignored; `autoPlay` applies only to mount/identity replacement. A dwell-setting change starts a fresh dwell if playing. Invalid replacement stops playback, renders the fallback and disables handle commands; when valid data returns, initialize as a fresh replacement.
- **Reduced motion.** Transitions and transit animation are removed. `autoPlay` is ignored, but explicit Play still advances on the timer. Pause is always available. If the motion preference changes to reduced while playing, pause with cause `preference` and discard animation; the user may explicitly resume timed playback. This is a design requirement, not an accessibility-conformance claim.

## Invalid-input behavior (*Proposal*)

`validateFlow(flow: unknown): FlowIssue[]` is exported and pure. It also checks runtime types for JavaScript consumers, including optional fields, enum values, arrays, finite numbers, and nested detail items. Component-only props are validated separately; `validateFlow` cannot assess props it does not receive. Each issue has the shape `{ severity: 'error' | 'warning'; code; path; message }`, for example `path: "steps[2].activeEdges[0]"`.

**Errors** — the player does not render a flow:
- `flow`, `id`, or `title` is missing;
- a node, edge, or step array is missing;
- there are fewer than 2 or more than 6 nodes;
- there are more than 12 edges, or more than 2 edges in one direction between the same pair of nodes;
- there are 0 or more than 24 steps;
- an ID is empty or duplicated within its collection;
- a node label, or a step title or description, is empty;
- an edge refers to an unknown node, is a self-loop, or connects non-adjacent nodes;
- a step refers to an unknown node or edge in `activeNodes`, `activeEdges`, `nodeDetails`, or `edgeLabels`;
- a step has more than 4 active edges.

**Warnings** — the player renders, and logs in development:
- a step has no active node or edge;
- text exceeds its recommended length (label 40, description 280, item 60 characters);
- a finite flow-step `durationMs` has been clamped to 800–20000ms.

Component-prop validation separately warns when a finite `stepDurationMs` is clamped, or when a non-integer/out-of-range `defaultStepIndex` resets to −1. Non-finite component durations use the 2400ms default; non-finite flow-step durations are flow errors. Prop warnings do not invoke `onInvalidFlow` or prevent valid flow rendering.

**When the flow has errors:**
- Invalid serializable flow data must not throw during render. This guarantee does not extend to arbitrary objects with throwing getters/proxies, errors in consumer callbacks, or consumer-supplied fallback rendering.
- It renders `invalidFlowFallback`, or a small default notice: "This flow could not be displayed."
- In development builds only, the notice also lists the issues.
- It calls `onInvalidFlow(issues)` once, and in development it logs `console.error`.
- Handle commands are no-ops.

## Styling contract (*Proposal*)

- **Distribution.** Ship one stylesheet, `@hneudev/flow-player/styles.css`, which the consumer imports explicitly. There is no CSS-in-JS runtime and no style injection at import. Pages Router permits importing CSS from `node_modules` in any component, so the portfolio can import it from the Lab route rather than `pages/_app.tsx`; prompt 12 chooses and records the load impact. Verify inclusion using the packed consumer fixture.
- **Selectors.** All selectors are prefixed with `fp-` and scoped under `.fp-root`, with no element, `*`, `:root`, `html`, or `body` selectors. The stylesheet does not reset or change document fonts, theme, or scrolling.
- **Specificity.** Parts use single-class selectors. That beats typical consumer element resets, such as the portfolio's `* { margin: 0; padding: 0 }` and `a { color: inherit }`. The stylesheet does not use `@layer` in v0.1, because unlayered consumer element rules would otherwise override it.
- **Defensive resets.** The component sets its own `box-sizing`, list, button, and margin styles on its own parts, so it looks the same with or without a host reset.
- **Root font size is not assumed.** `.fp-root { font-size: var(--fp-font-size, 1em) }` inherits from the container, and every internal dimension is in `em`. No `rem` values are used for layout. The portfolio's 62.5% root does not shrink the player; its body text (1.8rem = 18px) is inherited unless the adapter sets `--fp-font-size`. Prompt 10 validates this at both 16px and 62.5% roots.
- **Font.** `--fp-font-family` defaults to `inherit`. `--fp-font-mono` defaults to a system monospace stack. No web fonts are bundled.
- **Public custom properties.** The library never defines these on the consumer side:
  - `--fp-color-bg`, `--fp-color-surface`, `--fp-color-text`, `--fp-color-text-muted`, `--fp-color-border`;
  - `--fp-color-accent`, `--fp-color-on-accent`, `--fp-color-critical`, `--fp-color-focus`;
  - `--fp-radius`, `--fp-font-size`, `--fp-font-family`, `--fp-font-mono`, `--fp-duration`.
  Internally, `--_fp-x: var(--fp-color-x, <scheme default>)`. Consumer values therefore always win, whatever the `colorScheme`. The defaults use the reference palettes: light `#F6F6F2` / `#151515` / `#244BFF`, and night `#111318` / `#191C23` / `#F3F4F7` / `#8097FF`. Their contrast must be measured in prompt 10; the reference colors are approximations.
- **Stable parts.** Documented class names such as `fp-node`, `fp-edge`, `fp-step`, `fp-controls`, and `fp-description`, plus `data-state="pending|active|completed"`, `data-tone`, and `data-orientation` attributes, are public for targeted overrides. Treat changes to these hooks as public API changes; document breaking changes in a new 0.x minor release, keeping patch releases compatible.
- **Layout.** CSS grid plus container queries on `.fp-root`, with thresholds by node count. In vertical orientation, edges from a lower lane index to a higher one point down, and the others point up. Direction always comes from `from`/`to`.
- **Forced colors.** In forced-colors mode, edges and states use system colors. State is never conveyed by color alone: it also uses line style (solid, accent, dashed) and icons or text.

## Accessibility contract (*Proposal*)

**Markup:**
- The root is a `section` whose accessible name is `flow.title`.
- The diagram is an ordered list of nodes with visible text. Nodes are not focusable.
- Each connector has visually hidden text such as "Search query, Interface to Server, active".
- The legend is text: Completed, Active, Next.

**Controls:**
- Native buttons: Play/Pause/Resume/Replay (one button whose label changes), Previous, Next, Reset.
- Buttons are disabled when their command is a no-op.
- A step list of buttons marks the current step with `aria-current="step"`.
- Tab order: controls, then the step list.
- No global keyboard shortcuts in v0.1.
- Controls have a minimum target size of 44×44 CSS px at the default font size. WCAG 2.5.8 requires only 24px, so this is a stricter target.

**Focus:**
- `.fp-root :focus-visible` draws its own outline with `--fp-color-focus`, which overrides a host's pseudo-class-only rule.
- Focus stays on the activated control. When a control becomes disabled while focused (for example Next at the end), focus moves to Play/Replay.

**Announcements:**
- A single polite live region per instance.
- Manual navigation announces "Step k of n: title. description".
- Autoplay announces only "Step k of n: title", and nothing for intermediate animation.
- Completion and reset are announced once.

**Non-animated reading:**
- The current step's description is always visible as text.
- Every state is readable with animations removed.

**IDs:** instance-unique, derived from `useId` or the `id` prop. Multiple players on one page must not collide.

**Verification:** prompts 10–11 verify axe checks, keyboard-only use, reduced motion, forced colors, both schemes, and narrow containers. Screen-reader checks are manual and must be reported as such.

## Target consumer versions (*Proposal*, not yet verified)

| Area | Contract | Verified by |
| --- | --- | --- |
| React / React DOM | peer `^18.2.0 \|\| ^19.0.0`; never bundled | Consumer fixtures at 18.2.0 (portfolio floor), latest 18.x, latest 19.x |
| TypeScript (declarations) | Target TS 4.9.5 with `node`/`node16`; separately test a TS 5+ `bundler` fixture | Fixture using TS 4.9.5, `@types/react` 18.0.28, `moduleResolution: "node"`, `skipLibCheck: false` (stricter than the portfolio’s current `true`), retaining the portfolio’s legacy resolver. Library development may use newer TS. Declarations must avoid TS 5-only syntax and `React.JSX` (not present in `@types/react` 18.0.28). |
| `@types/react` | optional peer, `>=18.0.28` | Same fixture |
| Module format | ESM and CJS builds. Top-level `main`, `module`, and `types` fields for `moduleResolution: node`, plus an `exports` map with `./styles.css` | Packed-tarball fixture |
| Server rendering | Safe to import on the server (no `window` or `document` at module scope). SSR outputs the `defaultStepIndex` state; client-only work runs in effects; no hydration mismatch. The entry keeps `'use client'` for App Router hosts. | Fixture SSR render + hydration test |
| Browsers | Latest two majors of Chrome/Edge, Firefox, Safari; iOS Safari ≥ 16.4 (container queries) | Playwright Chromium, Firefox, WebKit in library CI |
| Runtime dependencies | None besides the React peers | `npm pack` contents check |

Next.js is not a dependency or assumption. The portfolio (Next 15 Pages Router) is one consumer.

## Example flows (*Proposal*)

Both examples are illustrative simulations and are labeled that way with `caption`. They live in the library repository's docs/playground and consumer fixtures, **not in the published package**. The portfolio writes its own configuration.

**1. Search — request and response.**
- Nodes: Interface → Server → Data (`meta`: React, Node.js API, Search index — simulation labels, not an audited stack).
- Edges: query (Interface→Server), lookup (Server→Data), records (Data→Server), results (Server→Interface).
- Four steps: Query submitted, Request checked, Matches found, Results displayed.
- Uses node details (the server checklist, "3 matches found", the result items) and per-step edge labels.
- The playground's search input builds the flow with `createSearchFlow(query)` against a fixed fictional index, giving `id: "search:" + query`. Running a new query exercises replacement.

**2. Content publishing — asynchronous job with retry.**
- Nodes: Editor → Content API → Job queue → Renderer → CDN (5 nodes).
- Seven steps:
  1. Publish requested.
  2. Accepted and queued. Two concurrent active edges: API→Editor "202 Accepted" and API→Queue "Enqueue build".
  3. Job picked up.
  4. Render failed (`tone: 'critical'`, Renderer→Queue "Retry scheduled").
  5. Retry picked up.
  6. Pages uploaded (Renderer→CDN).
  7. Live — CDN node active, no edge.

These differ in node count, early acknowledgement instead of request/response, concurrent edges, the failure tone, and a terminal step without an edge. Both must render through the same public component in both orientations, both schemes, and on one page together.

## Package, documentation, and portfolio boundaries (*Proposal*)

**Package (`packages/flow-player`):**
- Public exports: `FlowPlayer`, `validateFlow`, the types above, and `./styles.css`. Nothing else.
- The `files` allowlist is `dist/`, `README.md`, `LICENSE`, and `CHANGELOG.md`: no reference images, docs, examples, or tests.
- Versioning is 0.x semver, with breaking changes recorded in the changelog.
- The build tool is chosen in prompt 08 under these constraints.

**Docs/playground (`apps/docs`):**
- Uses npm workspaces with the package, because two related packages justify them.
- Imports only `@hneudev/flow-player` and its CSS. It never imports package `src/`, and CI should enforce that.
- Holds both example flows, the search input, and surrounding explanation.
- Reference images 15–17 may be copied into the library repository's documentation with a note that they are conceptual. They are never shipped.

**Portfolio (prompt 12):**
- Installs a packed tarball, and later the released version.
- Owns a local adapter that:
  - maps `--fp-*` properties to its semantic tokens, for example `--fp-color-surface: var(--surface)` and `--fp-color-accent: var(--brand)`, so its theme switch carries through without the library reading `ThemeProvider`;
  - optionally sets `--fp-font-size`;
  - supplies its own flow data outside `content/projects.ts` and employment records.
- Loads the player only on Lab routes where practical.
- Keeps Lab navigation hidden until the integration works.

**Library independence:** the library imports nothing from the portfolio — no aliases, styles, tokens, content, theme provider, model, or routing.
