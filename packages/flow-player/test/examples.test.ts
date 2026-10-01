import { describe, expect, it } from 'vitest';
import { createSearchFlow } from '../../../examples/search.js';
import { publishingFlow } from '../../../examples/publishing.js';
import { deriveFrame, validateFlow, type FlowDefinition } from '../src/engine/index.js';
import { setup } from './helpers.js';

const activeAt = (flow: FlowDefinition, index: number) => {
  const frame = deriveFrame(flow, index);
  return {
    nodes: frame.nodes.filter(entry => entry.state === 'active').map(entry => entry.node.id),
    edges: frame.edges.filter(entry => entry.state === 'active').map(entry => `${entry.edge.id}:${entry.direction}`),
  };
};

describe('search example', () => {
  const flow = createSearchFlow('navigation');

  it('is valid with no warnings', () => {
    expect(validateFlow(flow)).toEqual([]);
    expect(validateFlow(createSearchFlow(''))).toEqual([]);
    expect(validateFlow(createSearchFlow('x'.repeat(200)))).toEqual([]);
  });

  it('sends the request forward and returns the response backward along explicit edges', () => {
    expect([0, 1, 2, 3].map(index => activeAt(flow, index))).toEqual([
      { nodes: ['interface'], edges: ['query:forward'] },
      { nodes: ['server'], edges: ['lookup:forward'] },
      { nodes: ['data'], edges: ['records:backward'] },
      { nodes: ['interface'], edges: ['results:backward'] },
    ]);
  });

  it('keeps node details and edge labels synchronized with the step', () => {
    const frame = deriveFrame(flow, 2);
    expect(frame.step?.title).toBe('Matches found');
    expect(frame.nodes.find(entry => entry.node.id === 'data')?.detail?.badge).toBe('3 matches found');
    expect(frame.edges.find(entry => entry.edge.id === 'records')?.label).toBe('3 matching records');
    expect(frame.nodes.find(entry => entry.node.id === 'server')?.detail?.items?.map(item => item.state)).toEqual(['done', 'done', 'active']);
  });

  it('replaces playback when a new query produces a new flow id', () => {
    const { playback, scheduler, at } = setup(flow);
    playback.play();
    scheduler.advance(2500);
    expect(at()).toBe('playing:2');
    playback.setFlow(createSearchFlow('keyboard'));
    expect(at()).toBe('ready:-1');
    expect(playback.flow?.id).toBe('search:keyboard');
    playback.setFlow(createSearchFlow(' Keyboard '));
    expect(at()).toBe('ready:-1');
  });

  it('describes a search without matches', () => {
    const empty = createSearchFlow('zzz');
    expect(deriveFrame(empty, 2).step?.title).toBe('No matches');
  });
});

describe('publishing example', () => {
  it('is valid with no warnings', () => {
    expect(validateFlow(publishingFlow)).toEqual([]);
  });

  it('shows an early acknowledgement concurrently with the queued job, a failure and a retry', () => {
    expect(activeAt(publishingFlow, 1).edges).toEqual(['accepted:backward', 'enqueue:forward']);
    expect(deriveFrame(publishingFlow, 3).tone).toBe('critical');
    expect(activeAt(publishingFlow, 3).edges).toEqual(['retry:backward']);
    expect(deriveFrame(publishingFlow, 4).edges.find(entry => entry.edge.id === 'job')?.label).toBe('Build job (attempt 2)');
    expect(activeAt(publishingFlow, 6)).toEqual({ nodes: ['editor', 'cdn'], edges: [] });
  });

  it('clears carried-forward details when a step sets them to null', () => {
    expect(deriveFrame(publishingFlow, 4).nodes.find(entry => entry.node.id === 'renderer')?.detail?.badge).toBe('Attempt 2');
    expect(deriveFrame(publishingFlow, 5).nodes.find(entry => entry.node.id === 'renderer')?.detail).toBeNull();
  });

  it('plays to completion deterministically', () => {
    const { playback, scheduler, events, at } = setup(publishingFlow);
    playback.play();
    scheduler.advance(7 * 1000);
    expect(at()).toBe('completed:6');
    expect(events.filter(event => event.type === 'complete')).toHaveLength(1);
  });
});
