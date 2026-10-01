import { describe, expect, it } from 'vitest';
import { createPlayback, describeTransition, type PlaybackEvent } from '../src/engine/index.js';
import { FakeScheduler, makeFlow, setup } from './helpers.js';

const types = (events: PlaybackEvent[]) => events.map(event => (event.type === 'step' ? `step:${event.stepIndex}` : event.type === 'status' ? `status:${event.status}` : 'complete'));

describe('timed playback', () => {
  it('advances one step per dwell and completes after the last dwell', () => {
    const { playback, scheduler, at } = setup();
    playback.play();
    expect(at()).toBe('playing:0');
    scheduler.advance(999);
    expect(at()).toBe('playing:0');
    scheduler.advance(1);
    expect(at()).toBe('playing:1');
    scheduler.advance(1000);
    expect(at()).toBe('playing:2');
    scheduler.advance(1000);
    expect(at()).toBe('completed:2');
    expect(scheduler.pending).toBe(0);
  });

  it('uses per-step durations, clamped to the contract range', () => {
    const flow = makeFlow();
    flow.steps[0]!.durationMs = 3000;
    flow.steps[1]!.durationMs = 100; // clamped to 800
    const { playback, scheduler, at } = setup(flow);
    playback.play();
    scheduler.advance(2999);
    expect(at()).toBe('playing:0');
    scheduler.advance(1);
    expect(at()).toBe('playing:1');
    scheduler.advance(800);
    expect(at()).toBe('playing:2');
  });

  it('never keeps more than one pending timer, however often play is called', () => {
    const { playback, scheduler, events, at } = setup();
    playback.play();
    playback.play();
    playback.play();
    expect(scheduler.pending).toBe(1);
    expect(types(events)).toEqual(['step:0', 'status:playing']);
    scheduler.advance(1000);
    expect(at()).toBe('playing:1');
    expect(scheduler.pending).toBe(1);
  });

  it('replays from the first step after completion', () => {
    const { playback, scheduler, at } = setup();
    playback.play();
    scheduler.advance(3000);
    expect(at()).toBe('completed:2');
    playback.play();
    expect(at()).toBe('playing:0');
    expect(scheduler.pending).toBe(1);
  });
});

describe('pause and resume', () => {
  it('keeps the remaining dwell of the paused step', () => {
    const { playback, scheduler, at } = setup();
    playback.play();
    scheduler.advance(700);
    playback.pause();
    expect(at()).toBe('paused:0');
    expect(scheduler.pending).toBe(0);
    scheduler.advance(10_000);
    expect(at()).toBe('paused:0');
    playback.play();
    scheduler.advance(299);
    expect(at()).toBe('playing:0');
    scheduler.advance(1);
    expect(at()).toBe('playing:1');
  });

  it('starts a full dwell when resuming after navigating to another step', () => {
    const { playback, scheduler, at } = setup();
    playback.play();
    scheduler.advance(700);
    playback.pause();
    playback.next();
    playback.play();
    expect(at()).toBe('playing:1');
    scheduler.advance(999);
    expect(at()).toBe('playing:1');
    scheduler.advance(1);
    expect(at()).toBe('playing:2');
  });

  it('pauses manual navigation during playback', () => {
    const { playback, scheduler, at } = setup();
    playback.play();
    playback.next();
    expect(at()).toBe('paused:1');
    expect(scheduler.pending).toBe(0);
  });
});

describe('reset during playback', () => {
  it('returns to ready, cancels the timer and emits once', () => {
    const { playback, scheduler, events, at } = setup();
    playback.play();
    scheduler.advance(1500);
    events.length = 0;
    playback.reset();
    expect(at()).toBe('ready:-1');
    expect(scheduler.pending).toBe(0);
    expect(types(events)).toEqual(['step:-1', 'status:ready']);
    scheduler.advance(5000);
    expect(at()).toBe('ready:-1');
    playback.reset();
    expect(events).toHaveLength(2);
  });
});

describe('step boundaries', () => {
  it('handles both ends of the flow', () => {
    const { playback, at } = setup();
    playback.previous();
    expect(at()).toBe('ready:-1');
    playback.next();
    expect(at()).toBe('paused:0');
    playback.previous();
    expect(at()).toBe('ready:-1');
    playback.next();
    playback.next();
    playback.next();
    expect(at()).toBe('completed:2');
    playback.next();
    expect(at()).toBe('completed:2');
    playback.previous();
    expect(at()).toBe('paused:1');
  });

  it('ignores invalid goTo targets with a warning and accepts −1', () => {
    const { playback, warnings, at } = setup();
    playback.goTo(1);
    for (const target of [3, -2, 0.5, Number.NaN]) playback.goTo(target);
    expect(at()).toBe('paused:1');
    expect(warnings).toEqual(['invalid-value', 'invalid-value', 'invalid-value', 'invalid-value']);
    playback.goTo(-1);
    expect(at()).toBe('ready:-1');
    playback.goTo(2);
    expect(at()).toBe('completed:2');
  });

  it('pauses without a step event when the current step is selected during playback', () => {
    const { playback, scheduler, events, at } = setup();
    playback.play();
    scheduler.advance(1000);
    events.length = 0;
    playback.goTo(1);
    expect(at()).toBe('paused:1');
    expect(types(events)).toEqual(['status:paused']);
  });
});

describe('events', () => {
  it('orders step, status, then completion and reports causes', () => {
    const { playback, scheduler, events } = setup();
    playback.next();
    playback.next();
    events.length = 0;
    playback.next();
    expect(types(events)).toEqual(['step:2', 'status:completed', 'complete']);
    expect(events.every(event => event.cause === 'next')).toBe(true);

    events.length = 0;
    playback.play();
    scheduler.advance(3000);
    expect(events.map(event => event.cause)).toEqual(['play', 'play', 'timer', 'timer', 'timer', 'timer']);
    expect(types(events)).toEqual(['step:0', 'status:playing', 'step:1', 'step:2', 'status:completed', 'complete']);
  });

  it('emits nothing for the initial position or no-op commands', () => {
    const { playback, events } = setup(makeFlow(), { defaultStepIndex: 1 });
    expect(playback.getState()).toEqual({ status: 'paused', stepIndex: 1 });
    playback.pause();
    playback.goTo(1);
    expect(events).toEqual([]);
  });

  it('carries the step object so external content can stay synchronized', () => {
    const { playback, events } = setup();
    playback.next();
    const step = events.find(event => event.type === 'step');
    expect(step && step.type === 'step' && step.step?.id).toBe('s1');
    expect(playback.getFrame()?.step?.id).toBe('s1');
  });
});

describe('flow replacement and updates', () => {
  it('restarts at ready when the flow id changes', () => {
    const { playback, scheduler, events, at } = setup();
    playback.play();
    scheduler.advance(1500);
    events.length = 0;
    playback.setFlow(makeFlow({ id: 'other' }));
    expect(at()).toBe('ready:-1');
    expect(scheduler.pending).toBe(0);
    expect(events.map(event => event.cause)).toEqual(['replace', 'replace']);
  });

  it('starts the replacement immediately when autoPlay applies', () => {
    const { playback, scheduler, events, at } = setup(makeFlow(), { autoPlay: true });
    expect(at()).toBe('playing:0');
    scheduler.advance(1500);
    events.length = 0;
    playback.setFlow(makeFlow({ id: 'other' }));
    expect(at()).toBe('playing:0');
    expect(scheduler.pending).toBe(1);
    expect(events.map(event => event.cause)).toEqual(['replace']);
    expect(types(events)).toEqual(['step:0']);
    scheduler.advance(1000);
    expect(at()).toBe('playing:1');
  });

  it('ignores equivalent content in a new object without restarting the dwell', () => {
    const { playback, scheduler, events, at } = setup();
    playback.play();
    scheduler.advance(600);
    events.length = 0;
    playback.setFlow(makeFlow());
    expect(events).toEqual([]);
    scheduler.advance(400);
    expect(at()).toBe('playing:1');
  });

  it('keeps position on a same-id update and restarts the dwell while playing', () => {
    const { playback, scheduler, events, at } = setup();
    playback.play();
    scheduler.advance(1600);
    events.length = 0;
    const updated = makeFlow();
    updated.steps[1]!.title = 'Two (revised)';
    playback.setFlow(updated);
    expect(at()).toBe('playing:1');
    expect(types(events)).toEqual(['step:1']);
    expect(events[0]!.cause).toBe('update');
    scheduler.advance(999);
    expect(at()).toBe('playing:1');
    scheduler.advance(1);
    expect(at()).toBe('playing:2');
  });

  it('clamps the index when an update removes steps, keeping completion only at the last step', () => {
    const { playback, at } = setup();
    playback.goTo(2);
    expect(at()).toBe('completed:2');
    const shorter = makeFlow();
    shorter.steps.pop();
    playback.setFlow(shorter);
    expect(at()).toBe('completed:1');

    const longer = makeFlow();
    longer.steps.push({ id: 's4', title: 'Four', description: 'Fourth.', activeNodes: ['c'] });
    playback.setFlow(longer);
    expect(at()).toBe('paused:1');
  });

  it('stops on invalid data, disables commands, and starts fresh when valid data returns', () => {
    const issues: string[][] = [];
    const scheduler = new FakeScheduler();
    const events: PlaybackEvent[] = [];
    const playback = createPlayback(makeFlow(), {
      scheduler,
      stepDurationMs: 1000,
      onTransition: change => events.push(...describeTransition(change)),
      onIssues: list => issues.push(list.map(entry => entry.code)),
    });
    playback.connect();
    playback.play();
    scheduler.advance(1500);

    const broken = makeFlow();
    broken.steps[0]!.activeEdges = ['missing'];
    playback.setFlow(broken);
    expect(playback.flow).toBeNull();
    expect(playback.getFrame()).toBeNull();
    expect(playback.getState()).toEqual({ status: 'ready', stepIndex: -1 });
    expect(scheduler.pending).toBe(0);
    expect(issues[issues.length - 1]).toContain('unknown-edge');

    playback.play();
    playback.next();
    expect(playback.getState().status).toBe('ready');

    playback.setFlow(makeFlow());
    expect(playback.flow).not.toBeNull();
    playback.next();
    expect(playback.getState()).toEqual({ status: 'paused', stepIndex: 0 });
  });
});

describe('preferences and timing settings', () => {
  it('ignores autoPlay under reduced motion but allows explicit play', () => {
    const { playback, scheduler, at } = setup(makeFlow(), { autoPlay: true, reducedMotion: true });
    expect(at()).toBe('ready:-1');
    playback.play();
    scheduler.advance(1000);
    expect(at()).toBe('playing:1');
  });

  it('pauses with cause "preference" when reduced motion turns on during playback', () => {
    const { playback, scheduler, events, at } = setup();
    playback.play();
    scheduler.advance(400);
    events.length = 0;
    playback.setReducedMotion(true);
    expect(at()).toBe('paused:0');
    expect(events.map(event => event.cause)).toEqual(['preference']);
    playback.play();
    scheduler.advance(600);
    expect(at()).toBe('playing:1');
  });

  it('starts a fresh dwell when the player duration changes during playback', () => {
    const { playback, scheduler, warnings, at } = setup();
    playback.play();
    scheduler.advance(900);
    playback.setStepDuration(2000);
    scheduler.advance(1999);
    expect(at()).toBe('playing:0');
    scheduler.advance(1);
    expect(at()).toBe('playing:1');
    playback.setStepDuration(50);
    playback.setStepDuration(Number.NaN);
    expect(warnings).toEqual(['duration-clamped', 'invalid-value']);
  });

  it('resets an invalid defaultStepIndex to ready with a warning', () => {
    const { warnings, at } = setup(makeFlow(), { defaultStepIndex: 7 });
    expect(at()).toBe('ready:-1');
    expect(warnings).toEqual(['step-index-reset']);
  });
});

describe('lifecycle and cleanup', () => {
  it('schedules nothing until connected, which keeps server rendering timer-free', () => {
    const scheduler = new FakeScheduler();
    const playback = createPlayback(makeFlow(), { scheduler, autoPlay: true });
    expect(playback.getState().status).toBe('ready');
    expect(scheduler.pending).toBe(0);
    playback.connect();
    expect(playback.getState().status).toBe('playing');
    expect(scheduler.pending).toBe(1);
  });

  it('clears timers on disconnect and survives a Strict Mode style reconnect without duplicate events', () => {
    const scheduler = new FakeScheduler();
    const events: PlaybackEvent[] = [];
    const playback = createPlayback(makeFlow(), {
      scheduler,
      stepDurationMs: 1000,
      autoPlay: true,
      onTransition: change => events.push(...describeTransition(change)),
    });
    playback.connect();
    playback.disconnect();
    playback.connect();
    expect(types(events)).toEqual(['step:0', 'status:playing']);
    expect(scheduler.pending).toBe(1);

    scheduler.advance(400);
    playback.disconnect();
    expect(scheduler.pending).toBe(0);
    scheduler.advance(10_000);
    expect(playback.getState()).toEqual({ status: 'playing', stepIndex: 0 });
    playback.connect();
    scheduler.advance(599);
    expect(playback.getState().stepIndex).toBe(0);
    scheduler.advance(1);
    expect(playback.getState().stepIndex).toBe(1);
  });
});
