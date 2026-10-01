import { deriveFrame, type FlowFrame } from './frame.js';
import { LIMITS, clampDuration } from './limits.js';
import { READY, isValidStepIndex, landAt, transition, type PlaybackCommand, type PlaybackPosition } from './machine.js';
import { hasErrors, validateFlow } from './validate.js';
import type { ChangeCause, FlowDefinition, FlowIssue, FlowStep, PlaybackStatus } from './types.js';

/** Time source and timer functions. Injected in tests; the default touches globals only when called. */
export interface Scheduler {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const systemScheduler: Scheduler = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
};

export interface PlaybackTransition {
  flowId: string;
  previous: PlaybackPosition;
  current: PlaybackPosition;
  previousStep: FlowStep | null;
  step: FlowStep | null;
  /** True when the index changed or the step at the index has different content. */
  stepChanged: boolean;
  cause: ChangeCause;
}

export type PlaybackEvent =
  | { type: 'step'; stepIndex: number; previousStepIndex: number; step: FlowStep | null; cause: ChangeCause }
  | { type: 'status'; status: PlaybackStatus; previousStatus: PlaybackStatus; cause: ChangeCause }
  | { type: 'complete'; flowId: string; cause: ChangeCause };

/**
 * Orders the public events for one transition: step, then status, then completion.
 * A step event fires when the index or the content of the step at that index changes.
 */
export function describeTransition(change: PlaybackTransition): PlaybackEvent[] {
  const { previous, current, cause } = change;
  const events: PlaybackEvent[] = [];
  if (change.stepChanged) {
    events.push({ type: 'step', stepIndex: current.stepIndex, previousStepIndex: previous.stepIndex, step: change.step, cause });
  }
  if (previous.status !== current.status) {
    events.push({ type: 'status', status: current.status, previousStatus: previous.status, cause });
  }
  if (current.status === 'completed' && previous.status !== 'completed') {
    events.push({ type: 'complete', flowId: change.flowId, cause });
  }
  return events;
}

export interface PlaybackOptions {
  stepDurationMs?: number;
  /** Initial position. −1 (ready) by default. Ignored after creation. */
  defaultStepIndex?: number;
  /** Start playing on first connect and after identity replacement, unless motion is reduced. */
  autoPlay?: boolean;
  reducedMotion?: boolean;
  scheduler?: Scheduler;
  onTransition?(change: PlaybackTransition): void;
  /** Flow validation results, called when they change (including warnings). */
  onIssues?(issues: FlowIssue[]): void;
  /** Option and command warnings, such as a clamped duration or an ignored `goTo`. */
  onWarning?(warning: FlowIssue): void;
}

export interface PlaybackController {
  /** The current valid flow, or `null` while the supplied flow has errors. */
  readonly flow: FlowDefinition | null;
  readonly issues: readonly FlowIssue[];
  getState(): PlaybackPosition;
  getFrame(): FlowFrame | null;
  play(): void;
  pause(): void;
  next(): void;
  previous(): void;
  goTo(stepIndex: number): void;
  reset(): void;
  /** Replaces (new id) or updates (same id) the flow. Equivalent content is ignored. */
  setFlow(flow: unknown): void;
  setStepDuration(ms: number | undefined): void;
  setReducedMotion(reduced: boolean): void;
  /** Starts timers (for example, on mount). Safe to call repeatedly. */
  connect(): void;
  /** Stops timers but keeps state, so a later `connect` resumes (for example, Strict Mode remounts). */
  disconnect(): void;
}

function warning(code: FlowIssue['code'], path: string, message: string): FlowIssue {
  return { severity: 'warning', code, path, message };
}

/** Resolves the player-level duration; non-finite values fall back to the default. */
export function resolveStepDuration(ms: number | undefined, onWarning?: (w: FlowIssue) => void): number {
  if (ms === undefined) return LIMITS.defaultDurationMs;
  if (typeof ms !== 'number' || !Number.isFinite(ms)) {
    onWarning?.(warning('invalid-value', 'stepDurationMs', `stepDurationMs must be a finite number; using ${LIMITS.defaultDurationMs}ms.`));
    return LIMITS.defaultDurationMs;
  }
  const clamped = clampDuration(ms);
  if (clamped !== ms) {
    onWarning?.(warning('duration-clamped', 'stepDurationMs', `stepDurationMs is clamped to ${LIMITS.minDurationMs}–${LIMITS.maxDurationMs}ms.`));
  }
  return clamped;
}

/** Stable serialization for detecting equivalent flow content across new object references. */
function contentKey(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return Object.fromEntries(Object.keys(entry).sort().map(key => [key, (entry as Record<string, unknown>)[key]]));
    }
    return entry;
  });
}

export function createPlayback(initialFlow: unknown, options: PlaybackOptions = {}): PlaybackController {
  const scheduler = options.scheduler ?? systemScheduler;
  const autoPlay = options.autoPlay ?? false;
  let reducedMotion = options.reducedMotion ?? false;
  let stepDurationMs = resolveStepDuration(options.stepDurationMs, options.onWarning);

  let flow: FlowDefinition | null = null;
  let flowKey = '';
  let issues: FlowIssue[] = [];
  let state: PlaybackPosition = READY;
  let connected = false;
  let autoPlayPending = autoPlay;

  // Exactly one pending timer per controller.
  let timer: unknown = null;
  let timerStartedAt = 0;
  let timerMs = 0;
  let remaining: { stepIndex: number; ms: number } | null = null;

  function stepAt(target: FlowDefinition | null, index: number): FlowStep | null {
    return target && index >= 0 ? target.steps[index] ?? null : null;
  }

  function dwellFor(index: number): number {
    const own = flow?.steps[index]?.durationMs;
    return own === undefined ? stepDurationMs : clampDuration(own);
  }

  function clearTimer() {
    if (timer !== null) scheduler.clearTimeout(timer);
    timer = null;
  }

  function schedule(ms: number) {
    clearTimer();
    if (!connected || state.status !== 'playing') return;
    timerStartedAt = scheduler.now();
    timerMs = ms;
    timer = scheduler.setTimeout(onTimer, ms);
  }

  /** Dwell left for the current step: from the running timer, a stored pause, or a full dwell. */
  function remainingFor(index: number): number {
    if (timer !== null) return Math.max(0, timerMs - (scheduler.now() - timerStartedAt));
    return remaining?.stepIndex === index ? remaining.ms : dwellFor(index);
  }

  function onTimer() {
    timer = null;
    apply({ type: 'timer' }, 'timer');
  }

  function commit(next: PlaybackPosition, cause: ChangeCause, previousFlow: FlowDefinition | null) {
    const previous = state;
    const previousStep = stepAt(previousFlow, previous.stepIndex);
    state = next;
    const step = stepAt(flow, next.stepIndex);
    const stepChanged = previous.stepIndex !== next.stepIndex || (previousStep !== step && contentKey(previousStep) !== contentKey(step));
    if (previous.status === next.status && !stepChanged) return;
    options.onTransition?.({ flowId: (flow ?? previousFlow)?.id ?? '', previous, current: next, previousStep, step, stepChanged, cause });
  }

  function apply(command: PlaybackCommand, cause: ChangeCause) {
    if (!flow) return;
    const previous = state;
    const next = transition(previous, command, flow.steps.length);
    if (next === previous) return;

    let resumeMs: number | null = null;
    if (next.status === 'playing') {
      const resumes = previous.status === 'paused' && remaining?.stepIndex === next.stepIndex;
      resumeMs = resumes ? remaining!.ms : dwellFor(next.stepIndex);
      remaining = null;
    } else if (previous.status === 'playing' && (cause === 'pause' || cause === 'preference') && next.stepIndex === previous.stepIndex) {
      remaining = { stepIndex: previous.stepIndex, ms: remainingFor(previous.stepIndex) };
      clearTimer();
    } else {
      remaining = null;
      clearTimer();
    }
    commit(next, cause, flow);
    if (resumeMs !== null) schedule(resumeMs);
  }

  function initialPosition(target: FlowDefinition): PlaybackPosition {
    const requested = options.defaultStepIndex ?? -1;
    if (isValidStepIndex(requested, target.steps.length)) return landAt(requested, target.steps.length);
    options.onWarning?.(warning('step-index-reset', 'defaultStepIndex', `defaultStepIndex ${String(requested)} is outside the flow; starting at ready.`));
    return READY;
  }

  function setFlow(input: unknown) {
    const key = contentKey(input);
    if (flow && key === flowKey) {
      flow = input as FlowDefinition;
      return;
    }
    const nextIssues = validateFlow(input);
    issues = nextIssues;
    options.onIssues?.(nextIssues);
    const previousFlow = flow;
    clearTimer();
    remaining = null;

    if (hasErrors(nextIssues)) {
      flow = null;
      flowKey = '';
      commit(READY, 'replace', previousFlow);
      return;
    }

    const nextFlow = input as FlowDefinition;
    flowKey = key;
    flow = nextFlow;

    if (!previousFlow || previousFlow.id !== nextFlow.id) {
      // Identity replacement: start fresh, playing at once when autoPlay applies.
      const playsNow = autoPlay && connected && !reducedMotion;
      autoPlayPending = autoPlay && !connected;
      commit(playsNow ? { status: 'playing', stepIndex: 0 } : READY, 'replace', previousFlow);
      if (playsNow) schedule(dwellFor(0));
      return;
    }

    // Same identity, changed content: keep position where possible.
    const count = nextFlow.steps.length;
    const index = Math.min(state.stepIndex, count - 1);
    let next: PlaybackPosition;
    if (state.status === 'ready') next = READY;
    else if (state.status === 'completed') next = index === count - 1 ? { status: 'completed', stepIndex: index } : { status: 'paused', stepIndex: index };
    else next = { status: state.status, stepIndex: index };
    commit(next, 'update', previousFlow);
    if (state.status === 'playing') schedule(dwellFor(state.stepIndex));
  }

  function startAutoPlay() {
    if (!autoPlayPending || !connected || !flow) return;
    autoPlayPending = false;
    if (!reducedMotion) apply({ type: 'play' }, 'play');
  }

  // Initial flow: no events for the starting position.
  issues = validateFlow(initialFlow);
  options.onIssues?.(issues);
  if (!hasErrors(issues)) {
    flow = initialFlow as FlowDefinition;
    flowKey = contentKey(initialFlow);
    state = initialPosition(flow);
  }

  return {
    get flow() {
      return flow;
    },
    get issues() {
      return issues;
    },
    getState: () => state,
    getFrame: () => (flow ? deriveFrame(flow, state.stepIndex) : null),
    play: () => apply({ type: 'play' }, 'play'),
    pause: () => apply({ type: 'pause' }, 'pause'),
    next: () => apply({ type: 'next' }, 'next'),
    previous: () => apply({ type: 'previous' }, 'previous'),
    goTo(stepIndex: number) {
      if (!flow) return;
      if (!isValidStepIndex(stepIndex, flow.steps.length)) {
        options.onWarning?.(warning('invalid-value', 'goTo', `goTo(${String(stepIndex)}) is outside −1–${flow.steps.length - 1}; ignored.`));
        return;
      }
      apply({ type: 'select', stepIndex }, 'select');
    },
    reset: () => apply({ type: 'reset' }, 'reset'),
    setFlow,
    setStepDuration(ms) {
      const resolved = resolveStepDuration(ms, options.onWarning);
      if (resolved === stepDurationMs) return;
      stepDurationMs = resolved;
      remaining = null;
      if (state.status === 'playing') schedule(dwellFor(state.stepIndex));
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      if (reduced && state.status === 'playing') apply({ type: 'pause' }, 'preference');
    },
    connect() {
      if (connected) return;
      connected = true;
      if (state.status === 'playing') {
        const resume = remainingFor(state.stepIndex);
        remaining = null;
        schedule(resume);
      }
      startAutoPlay();
    },
    disconnect() {
      if (!connected) return;
      if (state.status === 'playing' && timer !== null) remaining = { stepIndex: state.stepIndex, ms: remainingFor(state.stepIndex) };
      clearTimer();
      connected = false;
    },
  };
}
