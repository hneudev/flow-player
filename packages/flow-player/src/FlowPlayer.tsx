'use client';

import { useEffect, useMemo, useRef, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { deriveFrame } from './engine/frame.js';
import { hasErrors, validateFlow } from './engine/validate.js';
import type { FlowDefinition, FlowIssue } from './engine/types.js';

export interface FlowPlayerProps {
  flow: FlowDefinition;
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** Rendered instead of the default notice when the flow has errors. */
  invalidFlowFallback?: ReactNode;
  /** Called once per invalid flow content with every issue found. */
  onInvalidFlow?(issues: FlowIssue[]): void;
}

// Declared locally so the build does not depend on Node types; bundlers replace NODE_ENV.
declare const process: { env: { NODE_ENV?: string } } | undefined;
const development = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

/**
 * Scaffold-stage component (prompt 08): renders the flow's ready state without playback.
 * Prompt 10 connects the playback engine, controls, events and the ref handle.
 */
export function FlowPlayer({ flow, className, style, id, invalidFlowFallback, onInvalidFlow }: FlowPlayerProps): ReactElement {
  const issues = useMemo(() => validateFlow(flow), [flow]);
  const invalid = hasErrors(issues);
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!invalid) return;
    const key = JSON.stringify(issues);
    if (reported.current === key) return;
    reported.current = key;
    onInvalidFlow?.(issues);
    if (development) console.error('[flow-player] The flow could not be displayed.', issues);
  }, [invalid, issues, onInvalidFlow]);

  const rootClass = className ? `fp-root ${className}` : 'fp-root';

  if (invalid) {
    return (
      <div className={rootClass} style={style} id={id} role="note">
        {invalidFlowFallback ?? (
          <>
            <p className="fp-notice">This flow could not be displayed.</p>
            {development && (
              <ul className="fp-issues">
                {issues.filter(entry => entry.severity === 'error').map(entry => (
                  <li key={`${entry.path}:${entry.code}`}>{`${entry.path}: ${entry.message}`}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    );
  }

  const frame = deriveFrame(flow, -1);
  return (
    <section className={rootClass} style={style} id={id} aria-label={flow.title} data-orientation="auto">
      <ol className="fp-lane">
        {frame.nodes.map(({ node, state }) => (
          <li key={node.id} className="fp-node" data-state={state}>
            {node.kind && <span className="fp-node-kind">{node.kind}</span>}
            <span className="fp-node-label">{node.label}</span>
            {node.meta && <span className="fp-node-meta">{node.meta}</span>}
          </li>
        ))}
      </ol>
      {flow.caption && <p className="fp-caption">{flow.caption}</p>}
    </section>
  );
}
