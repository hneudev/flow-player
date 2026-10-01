import type { PlaybackStatus } from './types.js';

export interface PlaybackPosition {
  status: PlaybackStatus;
  /** −1 while ready; otherwise the current step index. */
  stepIndex: number;
}

export type PlaybackCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'select'; stepIndex: number }
  | { type: 'reset' }
  | { type: 'timer' };

export const READY: PlaybackPosition = Object.freeze({ status: 'ready', stepIndex: -1 });

export function isValidStepIndex(stepIndex: number, stepCount: number): boolean {
  return Number.isInteger(stepIndex) && stepIndex >= -1 && stepIndex < stepCount;
}

/** Position reached by manual navigation: the last step counts as completed. */
export function landAt(stepIndex: number, stepCount: number): PlaybackPosition {
  if (stepIndex < 0) return READY;
  return { status: stepIndex === stepCount - 1 ? 'completed' : 'paused', stepIndex };
}

/**
 * Pure playback transition. Returns the same `position` object when the command is a no-op,
 * so callers can detect no-ops by identity. Timing is not modelled here.
 */
export function transition(position: PlaybackPosition, command: PlaybackCommand, stepCount: number): PlaybackPosition {
  const { status, stepIndex } = position;
  const last = stepCount - 1;
  if (stepCount < 1) return position;

  switch (command.type) {
    case 'play':
      if (status === 'playing') return position;
      if (status === 'paused') return { status: 'playing', stepIndex };
      return { status: 'playing', stepIndex: 0 };

    case 'pause':
      return status === 'playing' ? { status: 'paused', stepIndex } : position;

    case 'next':
      if (status === 'completed') return position;
      if (status === 'ready') return landAt(0, stepCount);
      // Advancing past the last step finishes the flow.
      return landAt(Math.min(stepIndex + 1, last), stepCount);

    case 'previous':
      if (status === 'ready') return position;
      return stepIndex <= 0 ? READY : { status: 'paused', stepIndex: stepIndex - 1 };

    case 'select': {
      const target = command.stepIndex;
      if (!isValidStepIndex(target, stepCount)) return position;
      if (target === -1) return status === 'ready' ? position : READY;
      if (target === stepIndex && status !== 'playing') return position;
      return landAt(target, stepCount);
    }

    case 'reset':
      return status === 'ready' ? position : READY;

    case 'timer':
      if (status !== 'playing') return position;
      return stepIndex < last ? { status: 'playing', stepIndex: stepIndex + 1 } : { status: 'completed', stepIndex: last };
  }
}
