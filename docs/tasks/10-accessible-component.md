# 10 — Accessible visual component

## Scope and baseline

Owner authorized task 10 after the portfolio pre-task handoff review. Library baseline: `81fd332`, clean at entry. The portfolio's task-07 handoff was corrected separately; this implementation stays in the independent library. The implementation milestone introduced no remote, publishing, portfolio integration, or docs/playground application; subsequent GitHub authorization is recorded below.

References: [accepted contract](../api-contract.md), [engine](../engine.md), [task 08](08-scaffold.md), [task 09](09-playback-engine.md), and [contributor instructions](../../AGENTS.md).

## Implementation

- `FlowPlayer` creates one existing playback controller per instance; effects own connect/disconnect, data updates, duration and live motion preference. Playback/data logic remains in the existing engine. The component drains transition events after commit, before invoking consumer callbacks, to avoid Strict Mode duplicates.
- Implemented native playback/step controls, disabled boundaries, stable instance IDs, ref commands, current-step marker, readable node/edge states and details, directional connectors, critical step tone, and a bounded polite announcement per committed update. Focus moves to Play/Replay when a focused command becomes disabled and remains outside the player when the visitor leaves it.
- Auto layout uses container queries with node-count thresholds. Forward/backward arrows retain semantic direction when stacked. Multiple players, explicit/system light/night colors, reduced motion, and forced-color tokens are isolated to `.fp-root` and namespaced parts. Internal dimensions use em; no global font/theme reset or host imports.
- Added exact development-only Playwright, axe and Vite dependencies. Browser fixture SSR-renders built public exports and hydrates them, with two illustrative examples. It is test/preview infrastructure, not prompt 11's documentation application. Packed consumer fixtures additionally check ref/props/events declarations on React 18/TS 4.9 and React 19/TS 5.
- Existing engine and accepted public contract are unchanged. `FlowPlayerLabels` defines named control/status strings and a `{n}`/`{total}` step template. The stylesheet is explicitly imported by consumers.

## Acceptance and verification

- Baseline passed: 90 engine tests, types/build, packed React 18.2/TS 4.9 and React 19.3/TS 5.9 consumers.
- Updated typecheck, all 90 engine tests, build and expanded packed consumers passed. The tarball remains restricted to distribution files and package docs; React is not bundled.
- Browser checks cover SSR/hydration, distinct IDs, event completion count, keyboard focus/boundaries, playback/pause/resume/reset, replacement, unmount cleanup, independent instances, invalid fallback/recovery, both schemes, container adaptation, two root sizes, host reset, arrow direction, reduced-motion preferences, forced colors, and axe violations in both themes.
- Initial Chromium and Firefox suites passed (five tests each). WebKit could not start with the host's missing libraries. Standard `playwright install-deps` requires sudo authentication unavailable in this session. A temporary user-space setup also failed at launch (missing transitive native library `libabsl_synchronization.so.20260107`); it was not adopted as a repository requirement. WebKit remains unverified and requires a supported host with Playwright system dependencies. No missing-engine tests are skipped by the committed suite.

## Final verification

- Final command: `npm run typecheck && npm test && npm run build && npm run check:consumers && npm run test:browser -- --project=chromium --project=firefox` passed: 90 unit tests, both packed consumer fixtures, and 10 browser journeys (30.4 seconds). No browser console/hydration errors or axe violations were detected by these checks.
- Default sRGB contrast ratios calculated from the final CSS tokens (not consumer overrides):
- Light: minimum body text 16.86:1, secondary text 6.31:1, control border 4.15:1, accent/focus 5.50:1 across background/surface; primary button text 5.96:1.
- Night: minimum body text 15.50:1, secondary text 8.19:1, control border 4.65:1, accent/focus 6.32:1 across background/surface; primary button text 6.89:1.
- Desktop/light and narrow/night screenshots were visually inspected. Local Markdown checks passed for 10 documents/30 links; whitespace checks passed.
- Full `npm run check` is **not green on this host**: WebKit cannot launch. Run the unchanged three-engine suite on a host with the documented native dependencies before treating cross-engine verification as complete.

## Reproduction and handoff

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run check
```

Run individual engines with `npm run test:browser -- --project=chromium` (or firefox/webkit). Build before browser checks. `npm run preview:component` serves the SSR verification fixture at `http://127.0.0.1:4310/`; use `?narrow=1&scheme=dark&small=1` for a narrow embed/night/62.5%-root example. Tests own the same port and deliberately refuse to reuse a running preview; stop it first.

Manual screen-reader use, physical touch devices, real Safari/iOS versions, and every claimed browser-version boundary remain unverified. Browser-engine automation is not a conformance certification. Consumer-provided colors and content still need contrast/readability review. No publication or deployment is authorized.

Review all uncommitted library changes against `81fd332`. Next roadmap milestone is prompt 11; do not start it automatically. Preserve the separate portfolio documentation diff against `b235e94`.

## Authorized GitHub handoff

Owner requested committing all pending work and pushing both repositories, explicitly selecting a private library repository. Created private `hneudev/flow-player` and configured `origin`. This commits the task-10 working tree against `81fd332`; verification and WebKit limitations above remain unchanged. No npm release, tag, or deployment is included.

## Review against the visual-component prompt (2026-10-01)

The owner re-issued prompt 10 with a record path of `docs/tasks/10-visual-component.md`. Task 10 was already implemented in `e55363f`, so this review continues this record instead of creating a duplicate file. The review checked the implementation against each requirement:
- nodes, connectors, active steps and explanations;
- container-based horizontal/vertical layout;
- keyboard controls and visible focus;
- reduced motion and a textual equivalent;
- scoped customization and multiple instances;
- SSR safety;
- no document-wide style or theme mutation;
- 16px and 62.5% roots.

**Fixed:**
- **Connector direction for screen readers.** Each connector's visually hidden text joined the node names with "→", for example "Search the library → Handle the request". Screen readers at default punctuation settings may skip that glyph, losing the direction. It now reads "… Search the library to Handle the request, Active", as the contract specifies. The joining word is the new optional `labels.to` (default "to"), an additive change to `FlowPlayerLabels`.
- **Coverage gap.** No test tabbed into the player, used Space, or checked that the focus indicator is drawn over a host's global `:focus-visible` rule. The fixture's `reset=1` mode now also mirrors portfolio-4.0's page-wide `:focus-visible` rule and `a { color: inherit }`. A new browser journey (62.5% root plus host reset) checks:
  - Tab entry from the page into the primary control;
  - the 3px solid player focus outline, not the host's;
  - that disabled boundary commands are skipped;
  - Space to operate Next, Resume and Pause;
  - Shift+Tab order;
  - the connector wording for a forward request and a backward response.

**Reviewed without change:**
- **Styles.** All selectors are scoped to `.fp-*`. The only global name is the prefixed `@keyframes fp-transit`.
- **Theme.** Set per instance with `data-color-scheme`; nothing is written to `document`.
- **Server rendering.** No `window` or `document` access during render. The controller starts with reduced motion assumed and resolves the real preference before `connect`, so SSR output and the first client render match and autoplay respects the preference.
- **Timers.** `disconnect` on unmount clears them.
- **Instances.** IDs come from `useId`, or the `id` prop.

**Verification (actual, 2026-10-01, Node 24.17.0 / npm 11.13.0, after a clean `npm ci`):**

| Check | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npm test` | 90 passed |
| `npm run build` then `npm run check:consumers` | Passed. Tarball 42 files / 21,570 bytes. React 18.2 + TS 4.9.5 (`node`, `node16`) and React 19.3 + TS 5.9 (`bundler`) |
| `npm run test:browser -- --project=chromium --project=firefox` | 12 passed: 6 journeys × 2 engines, 27.9s |
| WebKit | Still cannot launch on this host: missing native libraries such as `libgstcodecparsers`, `libflite`, `libavif`, `libsoup-3.0`, `libmanette`. All 6 WebKit journeys fail at launch, before any assertion. This is an environment limitation, not a pass. |

A component preview was already holding port 4310 from outside this session. The owner approved stopping it so that the browser suite could run.

Full `npm run check` remains not green on this host only because of WebKit. Screen-reader output itself (NVDA, VoiceOver) was not exercised; the wording fix rests on the DOM text asserted above.
