import { CodeBlock } from './CodeBlock';
import { Playground } from './Playground';
import minimalSource from './snippets/minimal.tsx?raw';
import eventsSource from './snippets/events.tsx?raw';
import stylingSource from './snippets/styling.tsx?raw';
import validationSource from './snippets/validation.tsx?raw';

const sections = [
  ['playground', 'Playground'],
  ['install', 'Install'],
  ['usage', 'Minimal usage'],
  ['schema', 'Flow schema'],
  ['playback', 'Playback'],
  ['events', 'Events and handle'],
  ['validation', 'Invalid input'],
  ['styling', 'Styling'],
  ['accessibility', 'Accessibility'],
  ['versions', 'Supported versions'],
  ['limitations', 'Limitations'],
  ['troubleshooting', 'Troubleshooting'],
] as const;

function Table({ label, head, rows }: { label: string; head: string[]; rows: (string | JSX.Element)[][] }) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={label}>
      <table>
        <thead>
          <tr>{head.map(cell => <th key={cell} scope="col">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const c = (text: string) => <code>{text}</code>;

export function App() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <p className="eyebrow">@hneudev/flow-player · 0.1.0 · MIT</p>
        <h1>Follow a flow, one step at a time.</h1>
        <p className="lede">
          A React component that plays scripted steps across a small, supplied architecture graph. It <em>explains</em> a flow; it does not
          observe, trace or run one.
        </p>
        <nav aria-label="Sections">
          <ul>
            {sections.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        <section id="playground" aria-labelledby="playground-title">
          <h2 id="playground-title">Playground</h2>
          <p>
            Run, pause, step through and reset two example flows with the player's own controls. The page uses only the package's public
            component, props, events and ref handle.
          </p>
          <Playground />
        </section>

        <section id="install" aria-labelledby="install-title">
          <h2 id="install-title">Install</h2>
          <CodeBlock label="Shell" code="npm install @hneudev/flow-player" />
          <p>
            React and React DOM are peer dependencies ({c('^18.2.0 || ^19.0.0')}); the package has no runtime dependencies. Import the
            stylesheet once, from any module (it is a plain CSS file in {c('node_modules')}).
          </p>
        </section>

        <section id="usage" aria-labelledby="usage-title">
          <h2 id="usage-title">Minimal usage</h2>
          <p>Describe nodes in lane order, the edges between neighbours, and the steps to play.</p>
          <CodeBlock label="minimal.tsx" code={minimalSource} />
        </section>

        <section id="schema" aria-labelledby="schema-title">
          <h2 id="schema-title">Flow schema</h2>
          <p>Flow data is plain, serializable data. Every string renders as text, never as HTML.</p>
          <h3>{c('FlowDefinition')}</h3>
          <Table label="FlowDefinition fields" head={['Field', 'Type', 'Notes']} rows={[
            ['id', c('string'), 'Identity. A new id replaces the flow and restarts playback.'],
            ['title', c('string'), 'Accessible name of the player, also shown as its title.'],
            ['caption', c('string?'), 'For example “Illustrative simulation”.'],
            ['nodes', c('FlowNode[]'), '2–6 nodes. Array order is the lane order.'],
            ['edges', c('FlowEdge[]'), 'At most 12; at most 2 per direction between the same pair.'],
            ['steps', c('FlowStep[]'), '1–24 steps.'],
          ]} />
          <h3>{c('FlowNode')} and {c('FlowEdge')}</h3>
          <Table label="FlowNode and FlowEdge fields" head={['Field', 'Type', 'Notes']} rows={[
            ['node.id / label', c('string'), 'Label recommended ≤ 40 characters.'],
            ['node.kind / meta', c('string?'), 'Short text above and below the label.'],
            ['edge.id', c('string'), 'Referenced by steps.'],
            ['edge.from / to', c('string'), 'Node ids. Must be neighbours in lane order. Direction always comes from these, never from layout.'],
            ['edge.label', c('string?'), 'Default connector label.'],
          ]} />
          <h3>{c('FlowStep')}</h3>
          <Table label="FlowStep fields" head={['Field', 'Type', 'Notes']} rows={[
            ['id / title / description', c('string'), 'Description recommended ≤ 280 characters.'],
            ['activeNodes / activeEdges', c('string[]?'), 'Ids active in this step; at most 4 active edges.'],
            ['tone', c("'default' | 'critical'"), 'Marks a failure step.'],
            ['nodeDetails', c('Record<nodeId, FlowNodeDetail | null>'), 'Badge, note and items. Carried forward to later steps until replaced; null clears.'],
            ['edgeLabels', c('Record<edgeId, string>'), 'Connector labels for this step only.'],
            ['durationMs', c('number?'), 'Dwell for this step, clamped to 800–20000 ms.'],
          ]} />
          <p>
            In any step, a node or edge is <strong>active</strong> if the step lists it, <strong>completed</strong> if an earlier step
            listed it, and otherwise <strong>pending</strong> (shown as “Next”).
          </p>
        </section>

        <section id="playback" aria-labelledby="playback-title">
          <h2 id="playback-title">Playback</h2>
          <p>
            The component owns playback state. It starts <strong>ready</strong> (nothing active) unless {c('defaultStepIndex')} says
            otherwise, and moves between <strong>playing</strong>, <strong>paused</strong> and <strong>completed</strong>.
          </p>
          <Table label="Playback controls" head={['Control', 'Effect']} rows={[
            ['Play / Resume / Replay', 'Plays from the first step; resumes a paused step with its remaining time; replays after completion.'],
            ['Pause', 'Stops the timer and keeps the remaining time of the current step.'],
            ['Previous / Next', 'Moves one step and pauses. Next on the last step completes; Previous on the first returns to ready.'],
            ['Step list', 'Jumps to a step and pauses. Choosing the last step completes the flow.'],
            ['Reset', 'Returns to ready.'],
          ]} />
          <Table label="Player props" head={['Prop', 'Default', 'Purpose']} rows={[
            ['flow', '—', 'Required flow definition.'],
            ['defaultStepIndex', c('-1'), 'Initial position (also what server rendering shows). Ignored after mount.'],
            ['autoPlay', c('false'), 'Starts on mount and after replacement; ignored under reduced motion.'],
            ['stepDurationMs', c('2400'), 'Dwell per step, clamped to 800–20000 ms.'],
            ['orientation', c("'auto'"), "'auto' follows the player's container width, not the viewport; or 'horizontal' / 'vertical'."],
            ['colorScheme', c("'system'"), "'light', 'dark' or 'system'. Never reads or writes the page theme."],
            ['reducedMotion', c("'user'"), "'always' forces the static presentation."],
            ['labels', c('Partial<FlowPlayerLabels>'), 'Control and status text for localization.'],
            ['className / style / id', '—', 'Passed to the root; id seeds internal ids.'],
            ['invalidFlowFallback', '—', 'Shown instead of the default notice for invalid data.'],
          ]} />
          <p>
            Treat flow objects as immutable. A new {c('id')} replaces the script and returns to ready. New content with the same id updates
            it in place and keeps the position where possible; an equivalent object in a new reference changes nothing.
          </p>
        </section>

        <section id="events" aria-labelledby="events-title">
          <h2 id="events-title">Events and handle</h2>
          <p>
            Callbacks fire after React commits, once per change, in the order step → status → complete. No-op commands and the initial
            position emit nothing. Each event carries a {c('cause')}: {c('play')}, {c('pause')}, {c('timer')}, {c('next')},{' '}
            {c('previous')}, {c('select')}, {c('reset')}, {c('replace')}, {c('update')} or {c('preference')}.
          </p>
          <Table label="Event callbacks" head={['Callback', 'Payload']} rows={[
            ['onStepChange', c('{ stepIndex, previousStepIndex, step, cause }')],
            ['onStatusChange', c('{ status, previousStatus, cause }')],
            ['onComplete', c('{ flowId, cause }')],
            ['onInvalidFlow', c('FlowIssue[]')],
          ]} />
          <p>
            A {c('ref')} exposes {c('play')}, {c('pause')}, {c('next')}, {c('previous')}, {c('goTo(stepIndex)')}, {c('reset')} and{' '}
            {c('getState()')}. {c('goTo(-1)')} returns to ready; out-of-range values are ignored with a development warning.
          </p>
          <CodeBlock label="events.tsx" code={eventsSource} />
        </section>

        <section id="validation" aria-labelledby="validation-title">
          <h2 id="validation-title">Invalid input</h2>
          <p>
            {c('validateFlow(flow)')} returns every issue with a {c('severity')}, {c('code')}, {c('path')} (for example{' '}
            {c('steps[2].activeEdges[0]')}) and message. Errors include unknown references, non-adjacent edges, duplicate ids and
            out-of-range counts. Warnings cover long text, clamped durations and steps with no activity.
          </p>
          <p>
            The player never throws for invalid serializable data. It renders a short notice (or your {c('invalidFlowFallback')}), calls{' '}
            {c('onInvalidFlow')} once, logs details only in development builds, and ignores handle commands until valid data arrives.
          </p>
          <CodeBlock label="validation.tsx" code={validationSource} />
        </section>

        <section id="styling" aria-labelledby="styling-title">
          <h2 id="styling-title">Styling</h2>
          <p>
            Every selector is scoped to {c('fp-')} classes; the stylesheet never targets {c('html')}, {c('body')}, {c(':root')} or{' '}
            {c('*')}, and the player never changes the page theme. Sizes use {c('em')}, so the player follows its container's font size and
            works with any root font size, including 62.5%.
          </p>
          <Table label="Styling custom properties" head={['Custom property', 'Controls']} rows={[
            ['--fp-color-bg / --fp-color-surface', 'Player and node backgrounds'],
            ['--fp-color-text / --fp-color-text-muted', 'Text and secondary text'],
            ['--fp-color-border', 'Borders and pending connectors'],
            ['--fp-color-accent / --fp-color-on-accent', 'Active state and primary button'],
            ['--fp-color-critical', 'Failure-step title'],
            ['--fp-color-focus', 'Focus outline'],
            ['--fp-radius', 'Corner radius'],
            ['--fp-font-size / --fp-font-family / --fp-font-mono', 'Type (font size defaults to the inherited 1em)'],
            ['--fp-duration', 'Length of the transit animation cycle'],
          ]} />
          <p>
            Values you set always win over the built-in light and dark defaults. Map them to your own design tokens so your theme switch
            carries through. Stable hooks for targeted overrides: classes such as {c('fp-node')}, {c('fp-edge')}, {c('fp-step')},{' '}
            {c('fp-controls')} and {c('fp-description')}, and the {c('data-state')}, {c('data-direction')}, {c('data-tone')},{' '}
            {c('data-status')} and {c('data-orientation')} attributes.
          </p>
          <CodeBlock label="styling.tsx" code={stylingSource} />
        </section>

        <section id="accessibility" aria-labelledby="accessibility-title">
          <h2 id="accessibility-title">Accessibility</h2>
          <ul>
            <li>Controls and the step list are native buttons in a predictable tab order. Commands that would do nothing are disabled. There are no global keyboard shortcuts.</li>
            <li>Focus is drawn by the player itself, so a host's global focus rule does not hide it. If the focused control becomes disabled, focus moves to Play/Replay.</li>
            <li>State is conveyed by text and line style as well as colour. The current step's description is always visible; connectors carry hidden text such as “Search query, Search the library to Handle the request, Active”.</li>
            <li>One polite live region announces step changes: title and description for manual navigation, title only during playback.</li>
            <li>Reduced motion removes animation and suppresses autoplay; turning it on during playback pauses. Forced-colours mode uses system colours.</li>
            <li>Controls are at least 44 × 44 CSS pixels at a 16px font size.</li>
          </ul>
          <p>
            Automated checks (axe, keyboard journeys) run in the repository. They are not a conformance certification: test your own
            content, colours and labels, and with a real screen reader, in your application.
          </p>
        </section>

        <section id="versions" aria-labelledby="versions-title">
          <h2 id="versions-title">Supported versions</h2>
          <Table label="Version support and verification" head={['Area', 'Support', 'Verified with']} rows={[
            ['React / React DOM', c('^18.2.0 || ^19.0.0'), 'Packed-tarball consumers on 18.2.0 and 19.3.0'],
            ['TypeScript', '≥ 4.9 (node, node16, bundler resolution)', 'TS 4.9.5 with @types/react 18.0.28; TS 5.9.3'],
            ['Modules', 'ESM and CommonJS, with types for both', 'Both entries rendered in Node'],
            ['Server rendering', 'Safe to import and render on the server; no timers start until mount', 'SSR + hydration browser fixture'],
            ['Browsers', 'Current Chrome/Edge, Firefox and Safari; iOS Safari ≥ 16.4', 'Chromium and Firefox automated; WebKit pending a capable host'],
          ]} />
        </section>

        <section id="limitations" aria-labelledby="limitations-title">
          <h2 id="limitations-title">Limitations</h2>
          <ul>
            <li>One lane of 2–6 nodes; edges only between neighbours. No branching layouts or automatic graph layout.</li>
            <li>Scripted, deterministic playback only: no real telemetry, tracing, code inspection, network capture or backend execution.</li>
            <li>No graph editing, loops or speed control, and no fully controlled playback mode; the component owns playback state.</li>
            <li>Flow text is plain text; rich content inside nodes is not supported.</li>
            <li>Pre-release: the API may change in 0.x minor versions. Not yet published to npm.</li>
          </ul>
        </section>

        <section id="troubleshooting" aria-labelledby="troubleshooting-title">
          <h2 id="troubleshooting-title">Troubleshooting</h2>
          <dl>
            <dt>The player is unstyled.</dt>
            <dd>Import {c('@hneudev/flow-player/styles.css')} once in your application.</dd>
            <dt>“This flow could not be displayed.”</dt>
            <dd>Run {c('validateFlow')} on the data; in development the notice also lists the issues.</dd>
            <dt>Playback restarts on every render.</dt>
            <dd>The flow's {c('id')} is changing. Keep ids stable; build flows in a module constant or {c('useMemo')}.</dd>
            <dt>Autoplay does nothing.</dt>
            <dd>The visitor prefers reduced motion, or {c('reducedMotion="always"')} is set. Explicit Play still works.</dd>
            <dt>Everything looks tiny or huge.</dt>
            <dd>The player inherits its container's font size; set {c('--fp-font-size')} on it.</dd>
          </dl>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          MIT licensed. The examples are illustrative simulations with fictional labels. The design references in the repository are
          conceptual and are not shipped in the package.
        </p>
      </footer>
    </>
  );
}
