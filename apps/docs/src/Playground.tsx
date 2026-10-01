import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FlowPlayer, type FlowPlayerHandle, type FlowPlayerProps } from '@hneudev/flow-player';
import { createSearchFlow } from '../../../examples/search';
import { publishingFlow } from '../../../examples/publishing';

type Example = 'search' | 'publishing';
type Scheme = NonNullable<FlowPlayerProps['colorScheme']>;
type Orientation = NonNullable<FlowPlayerProps['orientation']>;

/** Interactive playground. Everything here goes through the package's public props, events and handle. */
export function Playground() {
  const player = useRef<FlowPlayerHandle>(null);
  const [example, setExample] = useState<Example>('search');
  const [draft, setDraft] = useState('navigation');
  const [query, setQuery] = useState('navigation');
  const [scheme, setScheme] = useState<Scheme>('system');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [log, setLog] = useState<string[]>([]);
  const flow = useMemo(() => (example === 'search' ? createSearchFlow(query) : publishingFlow), [example, query]);
  const record = (line: string) => setLog(lines => [line, ...lines].slice(0, 8));
  const playAfterReplace = useRef(false);

  // Child effects run before parent effects, so the player has already replaced its flow here.
  useEffect(() => {
    if (!playAfterReplace.current) return;
    playAfterReplace.current = false;
    player.current?.play();
  }, [flow]);

  const runSearch = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim().toLowerCase() === query.trim().toLowerCase()) {
      // Same query, same flow id: restart the existing script.
      player.current?.reset();
      player.current?.play();
      return;
    }
    // A new query yields a new flow id, which replaces the script and returns it to ready.
    playAfterReplace.current = true;
    setQuery(draft);
  };

  return (
    <div className="playground">
      <p className="simulation" role="note">
        <strong>Illustrative simulation.</strong> No search runs, nothing is published, and no network request is made. The labels describe
        fictional systems.
      </p>
      <div className="playground-options">
        <fieldset>
          <legend>Example</legend>
          <label>
            <input type="radio" name="example" checked={example === 'search'} onChange={() => setExample('search')} /> Search request
          </label>
          <label>
            <input type="radio" name="example" checked={example === 'publishing'} onChange={() => setExample('publishing')} /> Publishing job
          </label>
        </fieldset>
        <label>
          Colour scheme{' '}
          <select value={scheme} onChange={event => setScheme(event.target.value as Scheme)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Orientation{' '}
          <select value={orientation} onChange={event => setOrientation(event.target.value as Orientation)}>
            <option value="auto">Auto (container width)</option>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
      </div>
      {example === 'search' && (
        <form className="search-form" onSubmit={runSearch}>
          <label htmlFor="search-query">Try a search</label>
          <input id="search-query" value={draft} onChange={event => setDraft(event.target.value)} maxLength={60} />
          <button type="submit">Run search</button>
          <span className="hint">Try “navigation”, “keyboard”, “forms” or something with no matches.</span>
        </form>
      )}
      <FlowPlayer
        ref={player}
        flow={flow}
        colorScheme={scheme}
        orientation={orientation}
        onStepChange={event => record(`step → ${event.stepIndex + 1}${event.step ? ` “${event.step.title}”` : ' (ready)'} · ${event.cause}`)}
        onStatusChange={event => record(`status → ${event.status} · ${event.cause}`)}
        onComplete={event => record(`complete · ${event.flowId}`)}
      />
      <section className="event-log" aria-labelledby="event-log-title">
        <h3 id="event-log-title">Events</h3>
        {log.length ? (
          <ol>
            {log.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
        ) : (
          <p>Use the player's controls; its events appear here, newest first.</p>
        )}
      </section>
    </div>
  );
}
