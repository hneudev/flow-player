import { useRef, useState } from 'react';
import { FlowPlayer, type FlowDefinition, type FlowPlayerHandle, type PlaybackStatus } from '@hneudev/flow-player';
import '@hneudev/flow-player/styles.css';

const flow: FlowDefinition = {
  id: 'two-steps',
  title: 'Two steps',
  nodes: [
    { id: 'a', label: 'First service' },
    { id: 'b', label: 'Second service' },
  ],
  edges: [{ id: 'ab', from: 'a', to: 'b', label: 'Call' }],
  steps: [
    { id: 'call', title: 'Call', description: 'The first service calls the second.', activeEdges: ['ab'] },
    { id: 'work', title: 'Work', description: 'The second service does the work.', activeNodes: ['b'] },
  ],
};

export default function EventsExample() {
  const player = useRef<FlowPlayerHandle>(null);
  const [status, setStatus] = useState<PlaybackStatus>('ready');
  const [stepTitle, setStepTitle] = useState('Not started');

  return (
    <div>
      <FlowPlayer
        ref={player}
        flow={flow}
        stepDurationMs={1600}
        onStepChange={event => setStepTitle(event.step?.title ?? 'Not started')}
        onStatusChange={event => setStatus(event.status)}
        onComplete={event => console.log('Finished', event.flowId)}
      />
      <p>
        Outside the player: {status}, {stepTitle}
      </p>
      <button type="button" onClick={() => player.current?.goTo(1)}>
        Jump to the last step
      </button>
    </div>
  );
}
