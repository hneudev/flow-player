import React, { StrictMode, useRef, useState } from 'react';
import { FlowPlayer, type FlowPlayerHandle, type FlowDefinition } from '@hneudev/flow-player';
import { createSearchFlow } from '../../examples/search';
import { publishingFlow } from '../../examples/publishing';
const search = createSearchFlow('navigation');
export function Fixture({ options }: { options: Record<string, string> }) {
  const first = useRef<FlowPlayerHandle>(null);
  const [flow, setFlow] = useState(search);
  const [visible, setVisible] = useState(true);
  const [scheme, setScheme] = useState<'light' | 'dark' | 'system'>((options.scheme || 'light') as 'light');
  const log = (type: string, event: unknown) => {
    if (typeof window !== 'undefined') (window as any).events.push({ type, event });
  };
  return <StrictMode><main>
    <h1>Component verification fixture</h1><p>Illustrative simulations; no real requests or publishing.</p>
    <label>Scheme <select value={scheme} onChange={event => setScheme(event.target.value as 'light')}><option>light</option><option>dark</option><option>system</option></select></label>
    <button onClick={() => setFlow(createSearchFlow('forms'))}>Replace flow</button>
    <button onClick={() => setFlow({ id: 'invalid' } as FlowDefinition)}>Invalid flow</button>
    <button onClick={() => first.current?.goTo(-1)}>Handle reset</button>
    <button onClick={() => setVisible(value => !value)}>Toggle player</button>
    {visible && <div id="first" style={{ width: options.narrow ? '280px' : '100%', maxWidth: '100%' }}><FlowPlayer ref={first} flow={flow} colorScheme={scheme}
      autoPlay={options.auto === '1'} stepDurationMs={800} defaultStepIndex={options.initial ? Number(options.initial) : undefined}
      onStepChange={event => log('step', event)} onStatusChange={event => log('status', event)} onComplete={event => log('complete', event)} onInvalidFlow={event => log('invalid', event)} /></div>}
    <div id="second"><FlowPlayer flow={publishingFlow} colorScheme={scheme} stepDurationMs={800} /></div>
  </main></StrictMode>;
}
