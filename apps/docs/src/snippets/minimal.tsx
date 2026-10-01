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
