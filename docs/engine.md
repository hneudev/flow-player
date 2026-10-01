# Playback engine

The engine is the rendering-independent core in `packages/flow-player/src/engine/`. It is **internal** in v0.1. The package's `exports` map exposes only `FlowPlayer`, `validateFlow`, the data types, and `styles.css`. The engine files are in the tarball because the component imports them, but consumers cannot import them through the `exports` map.

It contains no rendering code and no example or host terminology. Search and publishing exist only in [`examples/`](../examples).

## Modules

| Module | Responsibility |
| --- | --- |
| `types.ts` | Flow data types, playback status, change causes, and issue codes from the [contract](api-contract.md). |
| `limits.ts` | v0.1 limits (2–6 nodes, ≤12 edges, 1–24 steps, ≤4 active edges, durations 800–20000 ms, default 2400 ms). |
| `validate.ts` | `validateFlow(unknown)`: pure, never throws for serializable input, and reports every issue with its severity, code, and path. |
| `frame.ts` | `deriveFrame(flow, stepIndex)`: node and edge state, carried-forward details, per-step edge labels, tone, and semantic edge direction, all from one index. |
| `machine.ts` | `transition(position, command, stepCount)`: pure state table. It returns the same object for a no-op. |
| `playback.ts` | `createPlayback(flow, options)`: owns position, the single timer, pause dwell, replacement and updates, preferences, and the connect/disconnect lifecycle. `describeTransition` orders public events. |

## Synchronized state

`deriveFrame` is the only source of what a renderer shows:
- **Edges:** an edge is `active` when the current step lists it, `completed` when an earlier step listed it, and otherwise `pending`.
- **Nodes:** follow the same rule, using `activeNodes`.
- **Node details:** carry forward from the most recent step that sets them. A `null` entry clears them.
- **Edge labels:** a per-step label applies to that step only.

Node and edge states, details, labels, and the step text therefore cannot drift apart. They are all computed from the same `(flow, stepIndex)`.

Edge `direction` is `forward` when `from` precedes `to` in lane order (array order), otherwise `backward`. It is semantic. A renderer maps forward/backward to right/left or down/up for its orientation, and never infers direction from screen coordinates.

## Timing

- **One timer.** There is exactly one pending timer per controller, and `schedule` always clears the previous timer first. Repeated `play()` calls are no-ops while playing, so they cannot start a second loop.
- **Injectable time.** Time comes from an injectable `Scheduler` (`now`, `setTimeout`, `clearTimeout`). Tests use a manual fake clock. The default scheduler touches globals only when it is called.
- **Connect/disconnect.** No timer is scheduled before `connect()`, so server rendering never schedules one. `disconnect()` clears the timer but keeps position and the remaining dwell, so a Strict Mode style disconnect/reconnect neither duplicates events nor loses time. A component calls `connect` and `disconnect` from its mount effect.
- **No animation dependency.** Advancing never waits for animations or transition callbacks.

## Clarifications to the contract

The contract left these cases open; the engine resolves them as follows. Tests cover each one.

1. **`next` at the last step while playing or paused** gives `completed`. The table's `k+1` is undefined there, and manual arrival at the last step already counts as completion.
2. **Selecting the current step while playing at the last step** gives `completed`, following the manual-landing rule. At any other step it pauses without a step event.
3. **Remaining dwell** is kept only by `pause` and by a reduced-motion pause (`preference`). Any other move to a non-playing state discards it. Resuming at a different step starts a full dwell.
4. **Mount.** The initial position, from `defaultStepIndex`, emits nothing. If `autoPlay` starts playback on first `connect()`, that is a real transition with cause `play`. A Strict Mode reconnect does not repeat it.
5. **Replacement with `autoPlay`** is a single transition straight to `playing(0)` with cause `replace`, rather than a reset followed by a play.
6. **Same-id updates** report a step change only when the index changes or the current step's content differs. Equivalent content in a new object is detected by stable serialization and ignored entirely, so it doesn't restart the dwell. This relies on the contract's rule that flow data is serializable.
7. **Invalid replacement** emits one transition to `ready` with cause `replace`, so consumers that track state see playback stop. Commands are then no-ops. Valid data afterwards starts fresh (cause `replace`).
8. **Event ordering.** `describeTransition` emits step, then status, then `complete` (only when newly completed). A step event fires when the index changes or the step at the index changes.
9. **Duration warnings.** Player-level duration problems are warnings: clamped values give `duration-clamped`, and non-finite values give `invalid-value` with the 2400 ms default. A flow step's non-finite `durationMs` is a flow error. A finite out-of-range one is a warning and is clamped.

## Not in the engine

These are left to the component (prompt 10):
- rendering and orientation;
- the reduced-motion media query;
- the live region;
- mapping engine events to React callbacks;
- the ref handle and keyboard behaviour.
