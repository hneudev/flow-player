'use client';

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPlayback, describeTransition, type PlaybackController, type PlaybackEvent, type PlaybackTransition } from './engine/playback.js';
import type { FlowDefinition, FlowIssue, PlaybackStatus } from './engine/types.js';

export interface FlowPlayerLabels {
  play: string; pause: string; resume: string; replay: string; previous: string; next: string; reset: string;
  ready: string; playing: string; paused: string; completed: string; pending: string; active: string;
  legend: string; steps: string; controls: string; invalid: string; step: string;
  /** Joins source and target in connector text read by assistive technology, e.g. "Interface to Server". */
  to: string;
}
const defaults: FlowPlayerLabels = {
  play: 'Play', pause: 'Pause', resume: 'Resume', replay: 'Replay', previous: 'Previous', next: 'Next', reset: 'Reset',
  ready: 'Ready', playing: 'Playing', paused: 'Paused', completed: 'Completed', pending: 'Next', active: 'Active',
  legend: 'States', steps: 'Steps', controls: 'Playback controls', invalid: 'This flow could not be displayed.', step: 'Step {n} of {total}', to: 'to',
};
export interface FlowPlayerHandle {
  play(): void; pause(): void; next(): void; previous(): void; goTo(stepIndex: number): void; reset(): void;
  getState(): { status: PlaybackStatus; stepIndex: number };
}
type StepEvent = Omit<Extract<PlaybackEvent, { type: 'step' }>, 'type'>;
type StatusEvent = Omit<Extract<PlaybackEvent, { type: 'status' }>, 'type'>;
type CompleteEvent = Omit<Extract<PlaybackEvent, { type: 'complete' }>, 'type'>;
export interface FlowPlayerProps {
  flow: FlowDefinition; defaultStepIndex?: number; autoPlay?: boolean; stepDurationMs?: number;
  orientation?: 'auto' | 'horizontal' | 'vertical'; colorScheme?: 'light' | 'dark' | 'system'; reducedMotion?: 'user' | 'always';
  labels?: Partial<FlowPlayerLabels>; className?: string; style?: CSSProperties; id?: string;
  invalidFlowFallback?: ReactNode;
  onStepChange?(event: StepEvent): void; onStatusChange?(event: StatusEvent): void; onComplete?(event: CompleteEvent): void;
  onInvalidFlow?(issues: FlowIssue[]): void;
}
declare const process: { env: { NODE_ENV?: string } } | undefined;
const development = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export const FlowPlayer = forwardRef<FlowPlayerHandle, FlowPlayerProps>(function FlowPlayer(props, ref) {
  const { flow, className, style, id, orientation = 'auto', colorScheme = 'system', reducedMotion = 'user' } = props;
  const labels = { ...defaults, ...props.labels };
  const unique = useId();
  const instance = id ?? `fp-${unique}`;
  const root = useRef<HTMLElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const commandsFocus = useRef<HTMLElement | null>(null);
  const queue = useRef<PlaybackTransition[]>([]);
  const warnings = useRef<FlowIssue[]>([]);
  const [, refresh] = useState(0);
  const [announcement, announce] = useState('');
  const [motion, setMotion] = useState(reducedMotion === 'always');
  const controller = useRef<PlaybackController | null>(null);
  if (!controller.current) controller.current = createPlayback(flow, {
    defaultStepIndex: props.defaultStepIndex, autoPlay: props.autoPlay, stepDurationMs: props.stepDurationMs,
    // Server and first client render agree. Resolve OS preference before connect starts autoplay.
    reducedMotion: true,
    onTransition(change) { queue.current.push(change); refresh(value => value + 1); },
    onWarning(issue) { warnings.current.push(issue); },
  });
  const player = controller.current;
  const reported = useRef<string | null>(null);
  const reportedWarnings = useRef('');
  useImperativeHandle(ref, () => ({
    play: player.play, pause: player.pause, next: player.next, previous: player.previous, goTo: player.goTo,
    reset: player.reset, getState: player.getState,
  }), [player]);
  useEffect(() => { player.setFlow(flow); refresh(value => value + 1); }, [flow, player]);
  useEffect(() => { player.setStepDuration(props.stepDurationMs); }, [props.stepDurationMs, player]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => { const value = reducedMotion === 'always' || media.matches; setMotion(value); player.setReducedMotion(value); };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [player, reducedMotion]);
  useEffect(() => { player.connect(); return () => player.disconnect(); }, [player]);

  // Flush after React commits, and drain before calling consumers (including Strict Mode replay).
  useEffect(() => {
    const changes = queue.current.splice(0);
    for (const change of changes) {
      for (const event of describeTransition(change)) {
        const { type, ...value } = event;
        if (type === 'step') props.onStepChange?.(value as StepEvent);
        if (type === 'status') props.onStatusChange?.(value as StatusEvent);
        if (type === 'complete') props.onComplete?.(value as CompleteEvent);
      }
    }
    const last = changes[changes.length - 1];
    if (last) {
      const { stepIndex, status } = last.current;
      const position = labels.step.replace('{n}', String(stepIndex + 1)).replace('{total}', String(player.flow?.steps.length ?? 0));
      announce(status === 'ready' ? labels.ready : status === 'completed' ? labels.completed :
        `${position}: ${last.step?.title ?? ''}${status === 'playing' ? '' : `. ${last.step?.description ?? ''}`}`);
    }
    const previous = commandsFocus.current;
    if (previous instanceof HTMLButtonElement && previous.disabled && root.current?.contains(previous)) primary.current?.focus();
    if (previous instanceof HTMLButtonElement && previous.disabled) commandsFocus.current = null;
    const invalid = !player.flow;
    if (invalid) {
      const key = JSON.stringify([flow, player.issues]);
      if (reported.current !== key) {
        reported.current = key;
        props.onInvalidFlow?.([...player.issues]);
        if (development) console.error('[flow-player] The flow could not be displayed.', player.issues);
      }
    } else reported.current = null;
    const flowWarnings = player.issues.filter(issue => issue.severity === 'warning');
    const warningKey = JSON.stringify(flowWarnings);
    if (reportedWarnings.current !== warningKey) {
      reportedWarnings.current = warningKey;
      if (development) warnings.current.push(...flowWarnings);
    }
    if (development) for (const issue of warnings.current.splice(0)) console.warn('[flow-player]', issue.message);
    else warnings.current.length = 0;
  });
  const state = player.getState();
  const frame = player.getFrame();
  const currentFlow = player.flow;
  const rootClass = `fp-root${className ? ` ${className}` : ''}`;
  const run = (action: () => void) => { commandsFocus.current = document.activeElement as HTMLElement; action(); };
  if (!frame || !currentFlow) return <div className={rootClass} id={instance} style={style} data-color-scheme={colorScheme} role="note">
    {props.invalidFlowFallback ?? <><p className="fp-notice">{labels.invalid}</p>{development && <ul className="fp-issues">{player.issues.filter(issue => issue.severity === 'error').map(issue => <li className="fp-issue" key={`${issue.path}:${issue.code}`}>{issue.path}: {issue.message}</li>)}</ul>}</>}
  </div>;
  const position = labels.step.replace('{n}', String(state.stepIndex + 1)).replace('{total}', String(frame.stepCount));
  const playLabel = state.status === 'playing' ? labels.pause : state.status === 'completed' ? labels.replay : state.status === 'paused' ? labels.resume : labels.play;
  return <section ref={root} className={rootClass} id={instance} style={style} aria-label={currentFlow.title}
    onFocusCapture={event => { commandsFocus.current = event.target as HTMLElement; }}
    onBlurCapture={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) commandsFocus.current = null; }} data-color-scheme={colorScheme} data-orientation={orientation} data-count={frame.nodes.length} data-reduced-motion={motion} data-status={state.status} data-tone={frame.tone}>
    <div className="fp-header"><strong className="fp-title">{currentFlow.title}</strong><span className="fp-status">{labels[state.status]}</span></div>
    {currentFlow.caption && <p className="fp-caption">{currentFlow.caption}</p>}
    <div className="fp-controls" role="group" aria-label={labels.controls}>
      <button className="fp-button fp-primary" ref={primary} onClick={() => run(state.status === 'playing' ? player.pause : player.play)}>{playLabel}</button>
      <button className="fp-button" disabled={state.stepIndex < 0} onClick={() => run(player.previous)}>{labels.previous}</button>
      <button className="fp-button" disabled={state.status === 'completed'} onClick={() => run(player.next)}>{labels.next}</button>
      <button className="fp-button" disabled={state.status === 'ready'} onClick={() => run(player.reset)}>{labels.reset}</button>
    </div>
    <ol className="fp-steps" aria-label={labels.steps}>{currentFlow.steps.map((step, index) => <li className="fp-step-item" key={step.id}>
      <button className="fp-step fp-button" aria-current={index === state.stepIndex ? 'step' : undefined} onClick={() => run(() => player.goTo(index))}>{index + 1}. {step.title}</button>
    </li>)}</ol>
    <div className="fp-diagram"><ol className="fp-lane" style={{ '--_fp-count': frame.nodes.length } as CSSProperties}>
      {frame.nodes.map(({ node, state: nodeState, detail }, index) => {
        const edges = frame.edges.filter(({ edge }) => {
          const from = currentFlow.nodes.findIndex(item => item.id === edge.from);
          const to = currentFlow.nodes.findIndex(item => item.id === edge.to);
          return Math.min(from, to) === index;
        });
        return <li className="fp-lane-item" key={node.id}>
          <div className="fp-node" data-state={nodeState}>
            {node.kind && <span className="fp-node-kind">{node.kind}</span>}
            <strong className="fp-node-label">{node.label}</strong><span className="fp-state">{labels[nodeState]}</span>
            {detail?.badge && <strong className="fp-badge">{detail.badge}</strong>}{detail?.note && <span className="fp-note">{detail.note}</span>}
            {detail?.items && <ul className="fp-details">{detail.items.map((item, i) => <li className="fp-detail" key={i} data-state={item.state}>{item.state && <span>{item.state === 'done' ? labels.completed : labels[item.state]}: </span>}{item.label}</li>)}</ul>}
            {node.meta && <span className="fp-node-meta">{node.meta}</span>}
          </div>
          {index < frame.nodes.length - 1 && <div className="fp-edge-group">{edges.map(({ edge, direction, state: edgeState, label }) => <div className="fp-edge" key={edge.id} data-direction={direction} data-state={edgeState}>
            <span className="fp-arrow" aria-hidden="true">{direction === 'forward' ? '→' : '←'}</span>
            <span className="fp-edge-label" aria-hidden="true">{label}</span>
            <span className="fp-sr-only">{`${label ? `${label}, ` : ''}${currentFlow.nodes.find(item => item.id === edge.from)?.label} ${labels.to} ${currentFlow.nodes.find(item => item.id === edge.to)?.label}, ${labels[edgeState]}`}</span>
          </div>)}</div>}
        </li>;
      })}
    </ol></div>
    <p className="fp-legend" aria-label={labels.legend}><span>✓ {labels.completed}</span><span>● {labels.active}</span><span>○ {labels.pending}</span></p>
    <div className="fp-description" id={`${instance}-description`}><strong className="fp-step-title">{frame.step ? `${position}: ${frame.step.title}` : labels.ready}</strong>{frame.step && <p className="fp-step-description">{frame.step.description}</p>}</div>
    <p className="fp-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </section>;
});
