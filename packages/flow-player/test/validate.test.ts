import { describe, expect, it } from 'vitest';
import { validateFlow, type FlowIssue } from '../src/engine/index.js';
import { makeFlow } from './helpers.js';

const codes = (issues: FlowIssue[], severity: FlowIssue['severity'] = 'error') =>
  issues.filter(entry => entry.severity === severity).map(entry => `${entry.code}@${entry.path}`);

/** Validates a mutated copy of the basic flow. */
function check(mutate: (flow: any) => void, severity: FlowIssue['severity'] = 'error') {
  const flow: any = structuredClone(makeFlow());
  mutate(flow);
  return codes(validateFlow(flow), severity);
}

describe('validateFlow', () => {
  it('accepts the basic flow without issues', () => {
    expect(validateFlow(makeFlow())).toEqual([]);
  });

  it('rejects non-object input without throwing', () => {
    for (const input of [null, undefined, 42, 'flow', []]) {
      expect(codes(validateFlow(input))).toEqual(['invalid-type@flow']);
    }
  });

  it('reports missing and wrongly typed top-level fields', () => {
    expect(validateFlow({}).map(entry => entry.code)).toEqual(['missing-field', 'missing-field', 'missing-field', 'missing-field', 'missing-field']);
    expect(check(flow => { flow.nodes = 'a,b'; })).toContain('invalid-type@nodes');
    expect(check(flow => { flow.title = '  '; })).toEqual(['empty-text@flow.title']);
    expect(check(flow => { flow.caption = 3; })).toEqual(['invalid-type@flow.caption']);
  });

  it('enforces node, edge, step and active-edge limits', () => {
    expect(check(flow => { flow.nodes = flow.nodes.slice(0, 1); flow.edges = []; flow.steps.forEach((s: any) => { s.activeEdges = []; s.activeNodes = ['a']; }); })).toEqual(['node-count@nodes']);
    expect(check(flow => { for (let i = 0; i < 4; i++) flow.nodes.push({ id: `n${i}`, label: `N${i}` }); })).toEqual(['node-count@nodes']);
    expect(check(flow => { flow.steps = []; })).toEqual(['step-count@steps']);
    expect(check(flow => { for (let i = 0; i < 22; i++) flow.steps.push({ id: `x${i}`, title: 'X', description: 'X.', activeNodes: ['a'] }); })).toEqual(['step-count@steps']);
    expect(check(flow => { for (let i = 0; i < 10; i++) flow.edges.push({ id: `e${i}`, from: i % 2 ? 'a' : 'b', to: i % 2 ? 'b' : 'c' }); })).toContain('edge-count@edges');
    expect(check(flow => { flow.edges.push({ id: 'ab2', from: 'a', to: 'b' }, { id: 'ab3', from: 'a', to: 'b' }); })).toEqual(['parallel-edges@edges[4]']);
    expect(check(flow => {
      flow.edges.push({ id: 'ba', from: 'b', to: 'a' }, { id: 'cb2', from: 'c', to: 'b' });
      flow.steps[0].activeEdges = ['ab', 'bc', 'cb', 'ba', 'cb2'];
    })).toEqual(['too-many-active-edges@steps[0].activeEdges']);
  });

  it('reports empty and duplicate ids per collection', () => {
    expect(check(flow => { flow.nodes[1].id = 'a'; })).toContain('duplicate-id@nodes[1].id');
    expect(check(flow => { flow.steps[1].id = 's1'; })).toEqual(['duplicate-id@steps[1].id']);
    expect(check(flow => { flow.edges[0].id = ''; })).toContain('empty-id@edges[0].id');
    // The same id may appear in different collections.
    expect(check(flow => { flow.steps[0].id = 'a'; })).toEqual([]);
  });

  it('reports empty labels, titles and descriptions', () => {
    expect(check(flow => { flow.nodes[0].label = ''; flow.steps[0].title = ''; flow.steps[1].description = ' '; })).toEqual([
      'empty-text@nodes[0].label',
      'empty-text@steps[0].title',
      'empty-text@steps[1].description',
    ]);
  });

  it('rejects unknown endpoints, self-loops and non-adjacent edges', () => {
    expect(check(flow => { flow.edges[0].to = 'zz'; })).toEqual(['unknown-node@edges[0].to']);
    expect(check(flow => { flow.edges[0].to = 'a'; })).toEqual(['self-loop@edges[0]']);
    expect(check(flow => { flow.edges[0].to = 'c'; })).toEqual(['non-adjacent-edge@edges[0]']);
  });

  it('rejects step references to unknown nodes and edges in every field', () => {
    expect(check(flow => {
      flow.steps[0].activeNodes = ['zz'];
      flow.steps[0].activeEdges = ['ab', 'yy'];
      flow.steps[1].nodeDetails = { xx: { badge: 'B' } };
      flow.steps[1].edgeLabels = { ww: 'W' };
    })).toEqual([
      'unknown-node@steps[0].activeNodes[0]',
      'unknown-edge@steps[0].activeEdges[1]',
      'unknown-node@steps[1].nodeDetails.xx',
      'unknown-edge@steps[1].edgeLabels.ww',
    ]);
  });

  it('checks optional field types and enum values', () => {
    expect(check(flow => {
      flow.steps[0].tone = 'warning';
      flow.steps[0].durationMs = Infinity;
      flow.steps[1].activeNodes = 'a';
      flow.steps[1].nodeDetails = { a: { items: [{ label: 'X', state: 'skipped' }, 'Y'] }, b: 5 };
    }).sort()).toEqual([
      'invalid-type@steps[0].durationMs',
      'invalid-type@steps[1].activeNodes',
      'invalid-type@steps[1].nodeDetails.a.items[1]',
      'invalid-type@steps[1].nodeDetails.b',
      'invalid-value@steps[0].tone',
      'invalid-value@steps[1].nodeDetails.a.items[0].state',
    ]);
    expect(check(flow => { flow.steps[0].nodeDetails = { a: null }; })).toEqual([]);
  });

  it('warns without failing for long text, clamped durations and steps without activity', () => {
    const warnings = check(flow => {
      flow.nodes[0].label = 'L'.repeat(41);
      flow.steps[0].description = 'D'.repeat(281);
      flow.steps[0].durationMs = 50;
      flow.steps[1].activeNodes = [];
      flow.steps[1].activeEdges = [];
      flow.steps[2].nodeDetails = { c: { items: [{ label: 'I'.repeat(61) }] } };
    }, 'warning');
    expect(warnings).toEqual([
      'text-too-long@nodes[0].label',
      'text-too-long@steps[0].description',
      'duration-clamped@steps[0].durationMs',
      'no-activity@steps[1]',
      'text-too-long@steps[2].nodeDetails.c.items[0].label',
    ]);
  });
});
