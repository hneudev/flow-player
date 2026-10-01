import { describe, expect, it } from 'vitest';
import { deriveFrame } from '../src/engine/index.js';
import { makeFlow } from './helpers.js';

const states = (frame: ReturnType<typeof deriveFrame>) => ({
  nodes: Object.fromEntries(frame.nodes.map(entry => [entry.node.id, entry.state])),
  edges: Object.fromEntries(frame.edges.map(entry => [entry.edge.id, entry.state])),
});

describe('deriveFrame', () => {
  it('marks everything pending while ready', () => {
    const frame = deriveFrame(makeFlow(), -1);
    expect(frame.step).toBeNull();
    expect(states(frame)).toEqual({ nodes: { a: 'pending', b: 'pending', c: 'pending' }, edges: { ab: 'pending', bc: 'pending', cb: 'pending' } });
  });

  it('derives active, completed and pending from the same index for nodes and edges', () => {
    expect(states(deriveFrame(makeFlow(), 1))).toEqual({
      nodes: { a: 'completed', b: 'active', c: 'pending' },
      edges: { ab: 'completed', bc: 'active', cb: 'pending' },
    });
  });

  it('shows an element as active again when a later step reuses it', () => {
    const flow = makeFlow();
    flow.steps[2]!.activeNodes = ['a'];
    expect(states(deriveFrame(flow, 2)).nodes.a).toBe('active');
  });

  it('takes edge direction from data, not from position or drawing', () => {
    const frame = deriveFrame(makeFlow(), 0);
    expect(frame.edges.map(entry => [entry.edge.id, entry.direction])).toEqual([
      ['ab', 'forward'],
      ['bc', 'forward'],
      ['cb', 'backward'],
    ]);
  });

  it('carries node details forward until replaced or cleared with null', () => {
    const flow = makeFlow();
    flow.steps[0]!.nodeDetails = { a: { note: 'Waiting' } };
    flow.steps[2]!.nodeDetails = { a: null };
    expect(deriveFrame(flow, 0).nodes[0]!.detail).toEqual({ note: 'Waiting' });
    expect(deriveFrame(flow, 1).nodes[0]!.detail).toEqual({ note: 'Waiting' });
    expect(deriveFrame(flow, 2).nodes[0]!.detail).toBeNull();
    expect(deriveFrame(flow, -1).nodes[0]!.detail).toBeNull();
  });

  it('uses per-step edge labels for that step only', () => {
    const flow = makeFlow();
    flow.steps[1]!.edgeLabels = { ab: 'Override' };
    expect(deriveFrame(flow, 1).edges[0]!.label).toBe('Override');
    expect(deriveFrame(flow, 2).edges[0]!.label).toBe('Out');
    expect(deriveFrame(flow, 0).edges[1]!.label).toBeUndefined();
  });

  it('reports the step tone', () => {
    const flow = makeFlow();
    flow.steps[1]!.tone = 'critical';
    expect(deriveFrame(flow, 1).tone).toBe('critical');
    expect(deriveFrame(flow, 0).tone).toBe('default');
  });
});
