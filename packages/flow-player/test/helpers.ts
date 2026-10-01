import { createPlayback, describeTransition, type PlaybackEvent, type PlaybackOptions, type Scheduler } from '../src/engine/index.js';
import type { FlowDefinition } from '../src/engine/types.js';

/** Manual clock. Timers run only when `advance` moves time past their due point. */
export class FakeScheduler implements Scheduler {
  time = 0;
  private nextId = 1;
  private timers = new Map<number, { due: number; callback: () => void }>();

  now = () => this.time;
  setTimeout = (callback: () => void, ms: number) => {
    const id = this.nextId++;
    this.timers.set(id, { due: this.time + ms, callback });
    return id;
  };
  clearTimeout = (handle: unknown) => {
    this.timers.delete(handle as number);
  };

  get pending(): number {
    return this.timers.size;
  }

  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      let nextId: number | undefined;
      let nextDue = Infinity;
      for (const [id, timer] of this.timers) {
        if (timer.due <= target && timer.due < nextDue) {
          nextDue = timer.due;
          nextId = id;
        }
      }
      if (nextId === undefined) break;
      const timer = this.timers.get(nextId)!;
      this.timers.delete(nextId);
      this.time = timer.due;
      timer.callback();
    }
    this.time = target;
  }
}

/** A neutral three-node flow: forward and backward edges, three steps. */
export function makeFlow(overrides: Partial<FlowDefinition> = {}): FlowDefinition {
  return {
    id: 'basic',
    title: 'Basic flow',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
    edges: [
      { id: 'ab', from: 'a', to: 'b', label: 'Out' },
      { id: 'bc', from: 'b', to: 'c' },
      { id: 'cb', from: 'c', to: 'b', label: 'Back' },
    ],
    steps: [
      { id: 's1', title: 'One', description: 'First.', activeNodes: ['a'], activeEdges: ['ab'] },
      { id: 's2', title: 'Two', description: 'Second.', activeNodes: ['b'], activeEdges: ['bc'] },
      { id: 's3', title: 'Three', description: 'Third.', activeNodes: ['c'], activeEdges: ['cb'] },
    ],
    ...overrides,
  };
}

export function setup(flow: unknown = makeFlow(), options: Omit<PlaybackOptions, 'scheduler' | 'onTransition'> = {}) {
  const scheduler = new FakeScheduler();
  const events: PlaybackEvent[] = [];
  const warnings: string[] = [];
  const playback = createPlayback(flow, {
    stepDurationMs: 1000,
    ...options,
    scheduler,
    onTransition: change => events.push(...describeTransition(change)),
    onWarning: warning => warnings.push(warning.code),
  });
  playback.connect();
  const state = () => playback.getState();
  /** Compact form such as "playing:1". */
  const at = () => `${state().status}:${state().stepIndex}`;
  return { playback, scheduler, events, warnings, state, at };
}
