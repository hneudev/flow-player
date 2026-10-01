import { FlowPlayer, validateFlow, type FlowDefinition, type FlowIssue, type FlowPlayerProps } from '@hneudev/flow-player';

const flow: FlowDefinition = {
  id: 'typed',
  title: 'Typed flow',
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  edges: [{ id: 'ab', from: 'a', to: 'b' }],
  steps: [{ id: 's', title: 'S', description: 'S.', activeEdges: ['ab'], tone: 'critical', nodeDetails: { b: null } }],
};

const issues: FlowIssue[] = validateFlow(flow);
const report: FlowPlayerProps['onInvalidFlow'] = found => console.log(found.length + issues.length);

export const Consumer = () => <FlowPlayer flow={flow} className="demo" onInvalidFlow={report} />;

// @ts-expect-error `flow` is required.
export const Missing = () => <FlowPlayer />;

// @ts-expect-error tone is a closed union.
export const badTone: FlowDefinition['steps'][number]['tone'] = 'warning';
