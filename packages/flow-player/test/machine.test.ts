import { describe, expect, it } from 'vitest';
import { READY, transition, type PlaybackCommand, type PlaybackPosition } from '../src/engine/machine.js';

const n = 4;
const p = (status: PlaybackPosition['status'], stepIndex: number): PlaybackPosition => ({ status, stepIndex });
const show = (position: PlaybackPosition) => `${position.status}:${position.stepIndex}`;

// Rows of the accepted contract's transition table (n = 4, so the last index is 3).
const table: [PlaybackPosition, PlaybackCommand, string][] = [
  [READY, { type: 'play' }, 'playing:0'],
  [p('playing', 1), { type: 'play' }, 'playing:1'],
  [p('paused', 1), { type: 'play' }, 'playing:1'],
  [p('completed', 3), { type: 'play' }, 'playing:0'],

  [READY, { type: 'pause' }, 'ready:-1'],
  [p('playing', 1), { type: 'pause' }, 'paused:1'],
  [p('paused', 1), { type: 'pause' }, 'paused:1'],
  [p('completed', 3), { type: 'pause' }, 'completed:3'],

  [READY, { type: 'next' }, 'paused:0'],
  [p('playing', 1), { type: 'next' }, 'paused:2'],
  [p('paused', 1), { type: 'next' }, 'paused:2'],
  [p('paused', 2), { type: 'next' }, 'completed:3'],
  [p('paused', 3), { type: 'next' }, 'completed:3'],
  [p('playing', 3), { type: 'next' }, 'completed:3'],
  [p('completed', 3), { type: 'next' }, 'completed:3'],

  [READY, { type: 'previous' }, 'ready:-1'],
  [p('playing', 2), { type: 'previous' }, 'paused:1'],
  [p('playing', 0), { type: 'previous' }, 'ready:-1'],
  [p('paused', 2), { type: 'previous' }, 'paused:1'],
  [p('paused', 0), { type: 'previous' }, 'ready:-1'],
  [p('completed', 3), { type: 'previous' }, 'paused:2'],

  [READY, { type: 'select', stepIndex: 1 }, 'paused:1'],
  [p('playing', 1), { type: 'select', stepIndex: 2 }, 'paused:2'],
  [p('playing', 1), { type: 'select', stepIndex: 1 }, 'paused:1'],
  [p('paused', 1), { type: 'select', stepIndex: 3 }, 'completed:3'],
  [p('completed', 3), { type: 'select', stepIndex: 0 }, 'paused:0'],
  [p('paused', 2), { type: 'select', stepIndex: -1 }, 'ready:-1'],
  [p('completed', 3), { type: 'select', stepIndex: -1 }, 'ready:-1'],

  [READY, { type: 'reset' }, 'ready:-1'],
  [p('playing', 2), { type: 'reset' }, 'ready:-1'],
  [p('paused', 2), { type: 'reset' }, 'ready:-1'],
  [p('completed', 3), { type: 'reset' }, 'ready:-1'],

  [p('playing', 0), { type: 'timer' }, 'playing:1'],
  [p('playing', 3), { type: 'timer' }, 'completed:3'],
  [p('paused', 1), { type: 'timer' }, 'paused:1'],
];

describe('transition table', () => {
  it.each(table)('%o + %o → %s', (from, command, expected) => {
    expect(show(transition(from, command, n))).toBe(expected);
  });

  it('returns the same object for every no-op so callers can detect them', () => {
    const noOps: [PlaybackPosition, PlaybackCommand][] = [
      [READY, { type: 'pause' }],
      [READY, { type: 'previous' }],
      [READY, { type: 'reset' }],
      [READY, { type: 'select', stepIndex: -1 }],
      [p('playing', 1), { type: 'play' }],
      [p('paused', 1), { type: 'select', stepIndex: 1 }],
      [p('completed', 3), { type: 'select', stepIndex: 3 }],
      [p('completed', 3), { type: 'next' }],
      [p('paused', 1), { type: 'timer' }],
    ];
    for (const [from, command] of noOps) expect(transition(from, command, n)).toBe(from);
  });

  it('ignores out-of-range and non-integer selections', () => {
    const from = p('paused', 1);
    for (const stepIndex of [-2, 4, 1.5, Number.NaN, Infinity]) {
      expect(transition(from, { type: 'select', stepIndex }, n)).toBe(from);
    }
  });

  it('treats a single-step flow as completed on any manual arrival', () => {
    expect(show(transition(READY, { type: 'next' }, 1))).toBe('completed:0');
    expect(show(transition(p('completed', 0), { type: 'previous' }, 1))).toBe('ready:-1');
    expect(show(transition(p('playing', 0), { type: 'timer' }, 1))).toBe('completed:0');
  });
});
