import { createRef } from 'react';
import { FlowPlayer, type FlowPlayerHandle, type FlowPlayerLabels, validateFlow, type FlowDefinition, type FlowIssue, type FlowPlayerProps } from '@hneudev/flow-player';

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

const handle = createRef<FlowPlayerHandle>();
const labels: Partial<FlowPlayerLabels> = { play: 'Run', step: '{n}/{total}' };
export const InteractiveConsumer = () => <FlowPlayer flow={flow} ref={handle} labels={labels}
  colorScheme="dark" orientation="auto" reducedMotion="always" defaultStepIndex={0}
  onStepChange={event => console.log(event.stepIndex, event.step?.title)}
  onStatusChange={event => console.log(event.status, event.cause)} onComplete={event => console.log(event.flowId)} />;
handle.current?.goTo(-1);
// @ts-expect-error ref commands require numeric indices.
handle.current?.goTo('last');
// @ts-expect-error orientation is a closed union.
export const BadOrientation = () => <FlowPlayer flow={flow} orientation="diagonal" />;
