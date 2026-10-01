import { FlowPlayer, validateFlow, type FlowDefinition } from '@hneudev/flow-player';
import '@hneudev/flow-player/styles.css';

// This flow is deliberately invalid: the step refers to an edge that does not exist.
const flow: FlowDefinition = {
  id: 'broken',
  title: 'Broken flow',
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  edges: [],
  steps: [{ id: 'one', title: 'One', description: 'Uses a missing edge.', activeEdges: ['missing'] }],
};

// Check data in your own tests or at build time; every issue has a severity, code and path.
export const issues = validateFlow(flow);

export default function ValidationExample() {
  return (
    <FlowPlayer
      flow={flow}
      invalidFlowFallback={<p>The diagram is unavailable. The steps are described in the text below.</p>}
      onInvalidFlow={found => console.warn(found.map(issue => `${issue.path}: ${issue.message}`))}
    />
  );
}
