import type { FlowDefinition, FlowEdge, FlowNode, FlowNodeDetail, FlowStep, StepTone } from './types.js';

export type ElementState = 'pending' | 'active' | 'completed';

/** Semantic direction relative to lane order; independent of how the lane is drawn. */
export type EdgeDirection = 'forward' | 'backward';

export interface NodeFrame {
  node: FlowNode;
  laneIndex: number;
  state: ElementState;
  detail: FlowNodeDetail | null;
}

export interface EdgeFrame {
  edge: FlowEdge;
  direction: EdgeDirection;
  state: ElementState;
  label: string | undefined;
}

/** Everything a renderer needs for one step index, derived only from the flow and that index. */
export interface FlowFrame {
  stepIndex: number;
  stepCount: number;
  step: FlowStep | null;
  tone: StepTone;
  nodes: NodeFrame[];
  edges: EdgeFrame[];
}

function stateFor(id: string, list: (step: FlowStep) => string[] | undefined, steps: FlowStep[], stepIndex: number): ElementState {
  if (stepIndex < 0) return 'pending';
  if (list(steps[stepIndex]!)?.includes(id)) return 'active';
  for (let i = 0; i < stepIndex; i++) {
    if (list(steps[i]!)?.includes(id)) return 'completed';
  }
  return 'pending';
}

function detailFor(nodeId: string, steps: FlowStep[], stepIndex: number): FlowNodeDetail | null {
  for (let i = stepIndex; i >= 0; i--) {
    const details = steps[i]!.nodeDetails;
    if (details && Object.prototype.hasOwnProperty.call(details, nodeId)) return details[nodeId] ?? null;
  }
  return null;
}

/**
 * Derives node and edge state for `stepIndex` (−1 means ready). Expects a valid flow.
 * Active: listed in the current step. Completed: listed in an earlier step. Otherwise pending.
 */
export function deriveFrame(flow: FlowDefinition, stepIndex: number): FlowFrame {
  const { steps } = flow;
  const index = Math.max(-1, Math.min(stepIndex, steps.length - 1));
  const step = index >= 0 ? steps[index]! : null;
  const laneIndex = new Map(flow.nodes.map((node, i) => [node.id, i]));

  return {
    stepIndex: index,
    stepCount: steps.length,
    step,
    tone: step?.tone ?? 'default',
    nodes: flow.nodes.map((node, i) => ({
      node,
      laneIndex: i,
      state: stateFor(node.id, s => s.activeNodes, steps, index),
      detail: index >= 0 ? detailFor(node.id, steps, index) : null,
    })),
    edges: flow.edges.map(edge => ({
      edge,
      direction: laneIndex.get(edge.from)! < laneIndex.get(edge.to)! ? 'forward' : 'backward',
      state: stateFor(edge.id, s => s.activeEdges, steps, index),
      label: step?.edgeLabels?.[edge.id] ?? edge.label,
    })),
  };
}
