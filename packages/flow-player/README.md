# @hneudev/flow-player

A React component that plays scripted steps across a small, supplied architecture graph: nodes in a lane, directional edges between neighbours, and a step-by-step explanation. It **explains** a flow; it does not observe, trace or run one.

- Deterministic playback with built-in, keyboard-operable controls (play, pause, previous, next, reset, step list).
- Readable without animation: every state is shown as text, with a polite live region and reduced-motion support.
- Scoped CSS with custom properties; no global styles, theme changes or root font-size assumptions.
- Safe to import and render on the server. No runtime dependencies.

## Install

```sh
npm install @hneudev/flow-player
```

Peer dependencies: `react` and `react-dom` `^18.2.0 || ^19.0.0`. Import the stylesheet once, from any module.

## Usage

```tsx
import { FlowPlayer, type FlowDefinition } from '@hneudev/flow-player';
import '@hneudev/flow-player/styles.css';

const flow: FlowDefinition = {
  id: 'request-response',
  title: 'A request and its response',
  caption: 'Illustrative simulation',
  nodes: [
    { id: 'client', kind: 'Client', label: 'Send a request' },
    { id: 'service', kind: 'Service', label: 'Answer it' },
  ],
  edges: [
    { id: 'request', from: 'client', to: 'service', label: 'Request' },
    { id: 'response', from: 'service', to: 'client', label: 'Response' },
  ],
  steps: [
    {
      id: 'sent',
      title: 'Request sent',
      description: 'The client sends a request to the service.',
      activeNodes: ['client'],
      activeEdges: ['request'],
    },
    {
      id: 'answered',
      title: 'Response received',
      description: 'The service answers and the client shows the result.',
      activeNodes: ['service'],
      activeEdges: ['response'],
      nodeDetails: { client: { badge: 'Result shown' } },
    },
  ],
};

export default function MinimalExample() {
  return <FlowPlayer flow={flow} />;
}
```

## Flow data

| Part | Rules |
| --- | --- |
| `nodes` | 2–6 nodes. Array order is the lane order. Each has `id`, `label`, and optional `kind` and `meta`. |
| `edges` | At most 12. Each connects **neighbouring** nodes, in either direction, at most 2 per direction per pair. Direction always comes from `from` and `to`, never from layout. |
| `steps` | 1–24. Each has `id`, `title` and `description`, plus optional `activeNodes`, `activeEdges` (at most 4), `tone` (`'default'` or `'critical'`), `nodeDetails`, `edgeLabels` and `durationMs`. |

In a step, a node or edge is *active* if the step lists it, *completed* if an earlier step listed it, and otherwise *pending*. `nodeDetails` (a badge, note and items) carry forward to later steps until replaced; `null` clears them. `edgeLabels` apply to that step only. All text renders as text, never as HTML.

`validateFlow(flow)` returns every issue with a `severity`, `code`, `path` and `message`. A flow with errors renders a short notice instead of throwing. Pass `invalidFlowFallback` to replace the notice, and `onInvalidFlow` to receive the issues.

## Playback, events and handle

The component owns playback state: **ready** → **playing** / **paused** → **completed**.

| Prop | Default | Purpose |
| --- | --- | --- |
| `flow` | required | The flow definition. A new `id` replaces the script and returns to ready; changed content under the same id updates it in place. |
| `defaultStepIndex` | `-1` | Initial position, also used for server rendering. |
| `autoPlay` | `false` | Starts on mount and after replacement. Ignored when reduced motion is preferred. |
| `stepDurationMs` | `2400` | Dwell per step, clamped to 800–20000 ms. Steps can override it with `durationMs`. |
| `orientation` | `'auto'` | `'auto'` follows the player's container width, not the viewport; or `'horizontal'` / `'vertical'`. |
| `colorScheme` | `'system'` | `'light'`, `'dark'` or `'system'`. Never reads or writes the page theme. |
| `reducedMotion` | `'user'` | `'always'` forces the static presentation. |
| `labels` | English | Partial `FlowPlayerLabels` for localization. `step` uses `{n}` and `{total}`; `to` joins node names in connector text read by screen readers. |
| `className`, `style`, `id` | — | Applied to the root; `id` seeds internal ids. |

`onStepChange`, `onStatusChange` and `onComplete` fire after React commits, once per change, in that order, with a `cause` (`play`, `pause`, `timer`, `next`, `previous`, `select`, `reset`, `replace`, `update` or `preference`). No-op commands and the initial position emit nothing. A `ref` (`FlowPlayerHandle`) exposes `play`, `pause`, `next`, `previous`, `goTo(stepIndex)`, `reset` and `getState()`.

## Styling

Every selector is scoped to `fp-` classes; the stylesheet never targets `html`, `body`, `:root` or `*`. Sizes use `em`, so the player follows its container's font size. Set these custom properties on the player or an ancestor; your values always win over the built-in light and dark defaults:

`--fp-color-bg`, `--fp-color-surface`, `--fp-color-text`, `--fp-color-text-muted`, `--fp-color-border`, `--fp-color-accent`, `--fp-color-on-accent`, `--fp-color-critical`, `--fp-color-focus`, `--fp-radius`, `--fp-font-size`, `--fp-font-family`, `--fp-font-mono`, `--fp-duration`.

Stable hooks for targeted overrides: classes such as `fp-node`, `fp-edge`, `fp-step`, `fp-controls` and `fp-description`, and the `data-state`, `data-direction`, `data-tone`, `data-status` and `data-orientation` attributes.

## Accessibility

Controls are native buttons in a predictable tab order; commands that would do nothing are disabled, and there are no global shortcuts. The player draws its own focus outline. State is conveyed by text and line style as well as colour, the current step's description is always visible, and connectors carry hidden text such as "Search query, Search the library to Handle the request, Active". Reduced motion removes animation and suppresses autoplay; forced-colours mode uses system colours. Automated checks are not a conformance certification: test your own content, colours and labels, including with a screen reader.

## Compatibility (0.1.0)

| Area | Supported | Tested for this release |
| --- | --- | --- |
| React / React DOM | `^18.2.0 \|\| ^19.0.0` | 18.2.0 and 19.3.0, installed from the packed tarball |
| TypeScript | ≥ 4.9, with `node`, `node16` or `bundler` resolution | 4.9.5 (`@types/react` 18.0.28) with `node` and `node16`; 5.9.3 with `bundler` |
| Modules | ESM and CommonJS, each with declarations | Both entries server-rendered in Node 24 |
| Server rendering | Import and render on the server; timers start only after mount | SSR and hydration in a browser fixture |
| Browsers | Current Chrome/Edge, Firefox and Safari; iOS Safari ≥ 16.4 (container queries) | Chromium and Firefox automated. **Safari/WebKit not yet verified.** |

Versions outside the tested set are expected to work within the supported ranges but are not verified.

## Limitations

One lane of 2–6 nodes, with edges only between neighbours; no branching or automatic graph layout. Scripted playback only: no telemetry, tracing, code inspection, network capture or backend execution. No graph editing, loops, speed control or fully controlled playback mode. During 0.x, breaking changes ship in new minor versions; see the [changelog](https://github.com/hneudev/flow-player/blob/main/packages/flow-player/CHANGELOG.md).

## License

MIT © Hector Neudert. Source: [github.com/hneudev/flow-player](https://github.com/hneudev/flow-player).
