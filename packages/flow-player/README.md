# @hneudev/flow-player

A React component that plays scripted steps across a small, supplied architecture graph: nodes in a lane, directional edges between neighbours, and step-by-step explanations. It explains a flow; it does not observe, trace, or run one.

> **Status: pre-release (0.0.0), not published.** The package builds and installs from a packed tarball. The playback engine is implemented and tested. The visual player is still a static scaffold. Controls, timed playback in the UI, events, and the ref handle arrive in a later milestone.

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
- **Colours and type.** Customize with `--fp-color-bg`, `--fp-color-surface`, `--fp-color-text`, `--fp-color-text-muted`, `--fp-color-border`, `--fp-color-accent`, `--fp-radius`, `--fp-font-size`, `--fp-font-family` and `--fp-font-mono`.

## License

MIT
