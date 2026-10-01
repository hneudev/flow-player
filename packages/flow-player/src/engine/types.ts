/** A small, supplied process graph and the scripted steps played across it. */
export interface FlowDefinition {
  /** Identity. A different id replaces the flow and restarts playback. */
  id: string;
  /** Accessible name of the player. */
  title: string;
  /** Optional caption, such as a note that the flow is illustrative. */
  caption?: string;
  /** Nodes in lane order. Array order is the only source of position. */
  nodes: FlowNode[];
  edges: FlowEdge[];
  steps: FlowStep[];
}

export interface FlowNode {
  id: string;
  label: string;
  /** Short category shown above the label. */
  kind?: string;
  /** Short supporting text shown below the node content. */
  meta?: string;
}

export interface FlowEdge {
  id: string;
  /** Source node id. Direction always comes from `from` and `to`. */
  from: string;
  /** Target node id; must be adjacent to `from` in lane order. */
  to: string;
  label?: string;
}

export type StepTone = 'default' | 'critical';

export interface FlowStep {
  id: string;
  title: string;
  description: string;
  activeNodes?: string[];
  activeEdges?: string[];
  tone?: StepTone;
  /** Details keyed by node id. They carry forward until replaced or set to `null`. */
  nodeDetails?: Record<string, FlowNodeDetail | null>;
  /** Labels keyed by edge id, used for this step only. */
  edgeLabels?: Record<string, string>;
  /** Dwell time for this step, overriding the player's default. */
  durationMs?: number;
}

export type DetailItemState = 'pending' | 'active' | 'done';

export interface FlowNodeDetailItem {
  label: string;
  state?: DetailItemState;
}

export interface FlowNodeDetail {
  badge?: string;
  note?: string;
  items?: FlowNodeDetailItem[];
}

export type PlaybackStatus = 'ready' | 'playing' | 'paused' | 'completed';

export type ChangeCause =
  | 'play'
  | 'pause'
  | 'timer'
  | 'next'
  | 'previous'
  | 'select'
  | 'reset'
  | 'replace'
  | 'update'
  | 'preference';

export interface FlowIssue {
  severity: 'error' | 'warning';
  code: FlowIssueCode;
  /** Location in the input, such as `steps[2].activeEdges[0]`. */
  path: string;
  message: string;
}

export type FlowIssueCode =
  | 'invalid-type'
  | 'missing-field'
  | 'empty-text'
  | 'empty-id'
  | 'duplicate-id'
  | 'node-count'
  | 'edge-count'
  | 'parallel-edges'
  | 'step-count'
  | 'unknown-node'
  | 'unknown-edge'
  | 'self-loop'
  | 'non-adjacent-edge'
  | 'too-many-active-edges'
  | 'invalid-value'
  | 'no-activity'
  | 'text-too-long'
  | 'duration-clamped'
  | 'step-index-reset';
