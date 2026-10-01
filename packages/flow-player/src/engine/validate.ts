import { LIMITS, clampDuration } from './limits.js';
import type { FlowIssue, FlowIssueCode } from './types.js';

type Issues = FlowIssue[];

function issue(list: Issues, severity: FlowIssue['severity'], code: FlowIssueCode, path: string, message: string) {
  list.push({ severity, code, path, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(list: Issues, owner: Record<string, unknown>, key: string, path: string, code: 'empty-text' | 'empty-id') {
  const value = owner[key];
  const at = `${path}.${key}`;
  if (value === undefined) issue(list, 'error', 'missing-field', at, `${at} is required.`);
  else if (typeof value !== 'string') issue(list, 'error', 'invalid-type', at, `${at} must be a string.`);
  else if (value.trim() === '') issue(list, 'error', code, at, `${at} must not be empty.`);
  else return value;
  return undefined;
}

function optionalText(list: Issues, owner: Record<string, unknown>, key: string, path: string, maxLength?: number) {
  const value = owner[key];
  const at = `${path}.${key}`;
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    issue(list, 'error', 'invalid-type', at, `${at} must be a string when present.`);
    return undefined;
  }
  if (maxLength !== undefined) checkLength(list, value, at, maxLength);
  return value;
}

function checkLength(list: Issues, value: string, path: string, maxLength: number) {
  if (value.length > maxLength) {
    issue(list, 'warning', 'text-too-long', path, `${path} has ${value.length} characters; the recommended maximum is ${maxLength}.`);
  }
}

function collectIds(list: Issues, items: unknown[], path: string): Map<string, number> {
  const ids = new Map<string, number>();
  items.forEach((item, index) => {
    const at = `${path}[${index}]`;
    if (!isRecord(item)) {
      issue(list, 'error', 'invalid-type', at, `${at} must be an object.`);
      return;
    }
    const id = requireText(list, item, 'id', at, 'empty-id');
    if (id === undefined) return;
    if (ids.has(id)) issue(list, 'error', 'duplicate-id', `${at}.id`, `Duplicate id "${id}" in ${path}.`);
    else ids.set(id, index);
  });
  return ids;
}

function stringArray(list: Issues, owner: Record<string, unknown>, key: string, path: string): string[] {
  const value = owner[key];
  const at = `${path}.${key}`;
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issue(list, 'error', 'invalid-type', at, `${at} must be an array of ids.`);
    return [];
  }
  const result: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry === 'string') result.push(entry);
    else issue(list, 'error', 'invalid-type', `${at}[${index}]`, `${at}[${index}] must be a string id.`);
  });
  return result;
}

/**
 * Checks a flow against the v0.1 contract. Pure and safe for untyped input:
 * it never throws for serializable data. A flow with any `error` issue must not be played.
 */
export function validateFlow(flow: unknown): FlowIssue[] {
  const list: Issues = [];
  if (!isRecord(flow)) {
    issue(list, 'error', 'invalid-type', 'flow', 'The flow must be an object.');
    return list;
  }
  requireText(list, flow, 'id', 'flow', 'empty-id');
  requireText(list, flow, 'title', 'flow', 'empty-text');
  optionalText(list, flow, 'caption', 'flow');

  const arrays: Record<'nodes' | 'edges' | 'steps', unknown[] | undefined> = { nodes: undefined, edges: undefined, steps: undefined };
  for (const key of ['nodes', 'edges', 'steps'] as const) {
    const value = flow[key];
    if (value === undefined) issue(list, 'error', 'missing-field', key, `${key} is required.`);
    else if (!Array.isArray(value)) issue(list, 'error', 'invalid-type', key, `${key} must be an array.`);
    else arrays[key] = value;
  }
  const nodes = arrays.nodes ?? [];
  const edges = arrays.edges ?? [];
  const steps = arrays.steps ?? [];

  if (arrays.nodes && (nodes.length < LIMITS.minNodes || nodes.length > LIMITS.maxNodes)) {
    issue(list, 'error', 'node-count', 'nodes', `A flow needs ${LIMITS.minNodes}–${LIMITS.maxNodes} nodes; received ${nodes.length}.`);
  }
  if (arrays.edges && edges.length > LIMITS.maxEdges) {
    issue(list, 'error', 'edge-count', 'edges', `A flow allows at most ${LIMITS.maxEdges} edges; received ${edges.length}.`);
  }
  if (arrays.steps && (steps.length < LIMITS.minSteps || steps.length > LIMITS.maxSteps)) {
    issue(list, 'error', 'step-count', 'steps', `A flow needs ${LIMITS.minSteps}–${LIMITS.maxSteps} steps; received ${steps.length}.`);
  }

  const nodeIndex = collectIds(list, nodes, 'nodes');
  const edgeIds = collectIds(list, edges, 'edges');
  collectIds(list, steps, 'steps');

  nodes.forEach((node, index) => {
    if (!isRecord(node)) return;
    const at = `nodes[${index}]`;
    const label = requireText(list, node, 'label', at, 'empty-text');
    if (label !== undefined) checkLength(list, label, `${at}.label`, LIMITS.labelLength);
    optionalText(list, node, 'kind', at, LIMITS.labelLength);
    optionalText(list, node, 'meta', at, LIMITS.labelLength);
  });

  const pairCounts = new Map<string, number>();
  edges.forEach((edge, index) => {
    if (!isRecord(edge)) return;
    const at = `edges[${index}]`;
    optionalText(list, edge, 'label', at, LIMITS.labelLength);
    const from = requireText(list, edge, 'from', at, 'empty-id');
    const to = requireText(list, edge, 'to', at, 'empty-id');
    if (from === undefined || to === undefined) return;
    const fromIndex = nodeIndex.get(from);
    const toIndex = nodeIndex.get(to);
    if (fromIndex === undefined) issue(list, 'error', 'unknown-node', `${at}.from`, `Edge refers to unknown node "${from}".`);
    if (toIndex === undefined) issue(list, 'error', 'unknown-node', `${at}.to`, `Edge refers to unknown node "${to}".`);
    if (fromIndex === undefined || toIndex === undefined) return;
    if (from === to) {
      issue(list, 'error', 'self-loop', at, `Edge "${String(edge.id)}" connects node "${from}" to itself.`);
      return;
    }
    if (Math.abs(fromIndex - toIndex) !== 1) {
      issue(list, 'error', 'non-adjacent-edge', at, `Edge "${String(edge.id)}" must connect adjacent nodes in lane order.`);
      return;
    }
    const pair = `${from}\u0000${to}`;
    const count = (pairCounts.get(pair) ?? 0) + 1;
    pairCounts.set(pair, count);
    if (count === LIMITS.maxParallelEdges + 1) {
      issue(list, 'error', 'parallel-edges', at, `More than ${LIMITS.maxParallelEdges} edges run from "${from}" to "${to}".`);
    }
  });

  steps.forEach((step, index) => {
    if (!isRecord(step)) return;
    const at = `steps[${index}]`;
    requireText(list, step, 'title', at, 'empty-text');
    const description = requireText(list, step, 'description', at, 'empty-text');
    if (description !== undefined) checkLength(list, description, `${at}.description`, LIMITS.descriptionLength);

    const activeNodes = stringArray(list, step, 'activeNodes', at);
    const activeEdges = stringArray(list, step, 'activeEdges', at);
    activeNodes.forEach((id, i) => {
      if (!nodeIndex.has(id)) issue(list, 'error', 'unknown-node', `${at}.activeNodes[${i}]`, `Step refers to unknown node "${id}".`);
    });
    activeEdges.forEach((id, i) => {
      if (!edgeIds.has(id)) issue(list, 'error', 'unknown-edge', `${at}.activeEdges[${i}]`, `Step refers to unknown edge "${id}".`);
    });
    if (activeEdges.length > LIMITS.maxActiveEdgesPerStep) {
      issue(list, 'error', 'too-many-active-edges', `${at}.activeEdges`, `A step allows at most ${LIMITS.maxActiveEdgesPerStep} active edges.`);
    }
    if (activeNodes.length === 0 && activeEdges.length === 0) {
      issue(list, 'warning', 'no-activity', at, `Step "${String(step.id)}" has no active node or edge.`);
    }

    if (step.tone !== undefined && step.tone !== 'default' && step.tone !== 'critical') {
      issue(list, 'error', 'invalid-value', `${at}.tone`, `${at}.tone must be "default" or "critical".`);
    }

    if (step.durationMs !== undefined) {
      const duration = step.durationMs;
      if (typeof duration !== 'number' || !Number.isFinite(duration)) {
        issue(list, 'error', 'invalid-type', `${at}.durationMs`, `${at}.durationMs must be a finite number.`);
      } else if (clampDuration(duration) !== duration) {
        issue(list, 'warning', 'duration-clamped', `${at}.durationMs`, `${at}.durationMs is clamped to ${LIMITS.minDurationMs}–${LIMITS.maxDurationMs}ms.`);
      }
    }

    const details = step.nodeDetails;
    if (details !== undefined) {
      if (!isRecord(details)) issue(list, 'error', 'invalid-type', `${at}.nodeDetails`, `${at}.nodeDetails must be an object keyed by node id.`);
      else for (const [nodeId, detail] of Object.entries(details)) checkDetail(list, nodeIndex, nodeId, detail, `${at}.nodeDetails.${nodeId}`);
    }

    const labels = step.edgeLabels;
    if (labels !== undefined) {
      if (!isRecord(labels)) issue(list, 'error', 'invalid-type', `${at}.edgeLabels`, `${at}.edgeLabels must be an object keyed by edge id.`);
      else for (const [edgeId, label] of Object.entries(labels)) {
        const path = `${at}.edgeLabels.${edgeId}`;
        if (!edgeIds.has(edgeId)) issue(list, 'error', 'unknown-edge', path, `Step labels unknown edge "${edgeId}".`);
        if (typeof label !== 'string') issue(list, 'error', 'invalid-type', path, `${path} must be a string.`);
        else checkLength(list, label, path, LIMITS.labelLength);
      }
    }
  });

  return list;
}

function checkDetail(list: Issues, nodeIndex: Map<string, number>, nodeId: string, detail: unknown, path: string) {
  if (!nodeIndex.has(nodeId)) issue(list, 'error', 'unknown-node', path, `Step details refer to unknown node "${nodeId}".`);
  if (detail === null) return;
  if (!isRecord(detail)) {
    issue(list, 'error', 'invalid-type', path, `${path} must be an object or null.`);
    return;
  }
  optionalText(list, detail, 'badge', path, LIMITS.labelLength);
  optionalText(list, detail, 'note', path, LIMITS.descriptionLength);
  const items = detail.items;
  if (items === undefined) return;
  if (!Array.isArray(items)) {
    issue(list, 'error', 'invalid-type', `${path}.items`, `${path}.items must be an array.`);
    return;
  }
  items.forEach((item, index) => {
    const at = `${path}.items[${index}]`;
    if (!isRecord(item)) {
      issue(list, 'error', 'invalid-type', at, `${at} must be an object.`);
      return;
    }
    const label = requireText(list, item, 'label', at, 'empty-text');
    if (label !== undefined) checkLength(list, label, `${at}.label`, LIMITS.itemLength);
    if (item.state !== undefined && item.state !== 'pending' && item.state !== 'active' && item.state !== 'done') {
      issue(list, 'error', 'invalid-value', `${at}.state`, `${at}.state must be "pending", "active", or "done".`);
    }
  });
}

export function hasErrors(issues: readonly FlowIssue[]): boolean {
  return issues.some(entry => entry.severity === 'error');
}
