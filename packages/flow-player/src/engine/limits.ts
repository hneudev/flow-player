/** v0.1 graph and timing limits from the accepted contract. */
export const LIMITS = {
  minNodes: 2,
  maxNodes: 6,
  maxEdges: 12,
  maxParallelEdges: 2,
  minSteps: 1,
  maxSteps: 24,
  maxActiveEdgesPerStep: 4,
  labelLength: 40,
  descriptionLength: 280,
  itemLength: 60,
  minDurationMs: 800,
  maxDurationMs: 20000,
  defaultDurationMs: 2400,
} as const;

export function clampDuration(ms: number): number {
  return Math.min(LIMITS.maxDurationMs, Math.max(LIMITS.minDurationMs, ms));
}
