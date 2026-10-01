# @hneudev/flow-player

A React component that plays scripted steps across a small, supplied architecture graph: nodes in a lane, directional edges between neighbours, and step-by-step explanations. It explains a flow; it does not observe, trace, or run one.

> **Status: pre-release (0.0.0), not published.** The package builds and installs from a packed tarball. The playback engine is implemented and tested. The visual player now connects the engine, native controls, step selection, events and a React ref handle. Browser/SSR verification and remaining limits are recorded in the repository task-10 document.

## Install

Not yet on npm. Local validation uses a packed tarball:

```sh
npm run build && npm pack -w @hneudev/flow-player
npm install ./hneudev-flow-player-0.0.0.tgz   # in the consuming project
```

Peer dependencies: `react` and `react-dom` `^18.2.0 || ^19.0.0`. There are no runtime dependencies.

## Usage

```tsx
import { FlowPlayer, type FlowDefinition } from '@hneudev/flow-player';
import '@hneudev/flow-player/styles.css';

const flow: FlowDefinition = {
  id: 'request',
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
    { id: 'sent', title: 'Sent', description: 'The client sends a request.', activeNodes: ['client'], activeEdges: ['request'] },
    { id: 'answered', title: 'Answered', description: 'The service responds.', activeNodes: ['service'], activeEdges: ['response'] },
  ],
};

export function Example() {
  return <FlowPlayer flow={flow} />;
}
```

## Flow rules (v0.1)

- **Nodes.** 2–6 nodes, in lane order (array order).
- **Edges.** Each edge connects neighbouring nodes in either direction. There are at most 12 edges, and at most 2 per direction between the same pair. Direction always comes from `from` and `to`, never from layout.
- **Steps.** 1–24 steps, each with at most 4 active edges.
- **Content.** All text renders as text, not HTML.

Call `validateFlow(flow)` to get every issue with a severity, code, and path. A flow with errors renders a short notice instead of throwing. Pass `invalidFlowFallback` to replace the notice, and `onInvalidFlow` to receive the issues.

## Styling

- **Scope.** The stylesheet is scoped under `.fp-root` and never targets `html`, `body`, `:root`, or `*`.
- **Sizing.** Sizes use `em`, so the player follows its container's font size and does not depend on the root font size.
- **Colours and type.** Customize with `--fp-color-bg`, `--fp-color-surface`, `--fp-color-text`, `--fp-color-text-muted`, `--fp-color-border`, `--fp-color-accent`, `--fp-color-on-accent`, `--fp-color-critical`, `--fp-color-focus`, `--fp-duration`, `--fp-radius`, `--fp-font-size`, `--fp-font-family` and `--fp-font-mono`.

## License

MIT


## Playback and accessibility

Default state is ready. Play/Pause/Resume/Replay, Previous, Next and Reset are native buttons; the step list supports direct selection. The component owns playback state. `defaultStepIndex` chooses the initial SSR state; `stepDurationMs` defaults to 2400 (clamped to 800–20000). `autoPlay` defaults to false and is suppressed under reduced motion. Explicit Play remains available without animation. Timers stop on unmount.

`orientation` accepts auto/horizontal/vertical; auto uses the component container, not the page viewport. `colorScheme` accepts system/light/dark; system is the default. `reducedMotion="always"` forces static presentation. Use the `labels` partial object for control and status strings; `step` uses `{n}` and `{total}` placeholders, and `to` joins the two node names in each connector's screen-reader text ("Interface to Server").

Use `ref<FlowPlayerHandle>` for play, pause, next, previous, goTo, reset and getState. `onStepChange`, `onStatusChange`, and `onComplete` report committed transitions; no-op commands emit nothing. Supply immutable flow data; a new ID replaces the script, while changed content under the same ID updates it. Data and examples remain consumer-owned.

State is communicated through text and line styles as well as color. A single polite live region summarizes steps; focus remains in the controls, moving to Play/Replay if the focused command becomes disabled. There are no global keyboard shortcuts. Provide meaningful plain-text titles/descriptions; test custom labels/colors and manual screen-reader use in the consuming application.
