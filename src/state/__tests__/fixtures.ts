import type { Shift, ShiftStatus, ShiftsState, User } from '../../types';

/**
 * Reducer/selector test fixtures. Everything is offset from a fixed anchor
 * date (`NOW`) so week-boundary logic is deterministic regardless of when
 * the suite runs. Dates are computed as plain epoch deltas — we deliberately
 * avoid the module under test's own helpers so the tests don't lean on the
 * same code they're trying to verify.
 */

const H = 60 * 60 * 1000;
const D = 24 * H;

/** Anchor: Wednesday 2026-05-13 12:00 UTC. A mid-week time keeps the
 *  startOfWeek math well-defined in any reasonable timezone. */
export const NOW = new Date('2026-05-13T12:00:00Z');

export function at(offsetHours: number, base: Date = NOW): string {
  return new Date(base.getTime() + offsetHours * H).toISOString();
}

export function days(n: number): number {
  return (n * D) / H;
}

export const users: Record<string, User> = {
  'u-maya': { id: 'u-maya', name: 'Maya Chen', role: 'Server' },
  'u-alex': { id: 'u-alex', name: 'Alex Rivera', role: 'Server' },
  'u-jules': { id: 'u-jules', name: 'Jules Park', role: 'Bartender' },
  'u-sam': { id: 'u-sam', name: 'Sam Okafor', role: 'Bartender' },
};

export interface ShiftOverride {
  id?: string;
  assignedUserId?: string;
  claimedByUserId?: string | null;
  status?: ShiftStatus;
  role?: Shift['role'];
  /** Hours from NOW for startTime. */
  startOffsetHours?: number;
  /** Hours duration. */
  durationHours?: number;
}

let autoId = 0;
export function makeShift(o: ShiftOverride = {}): Shift {
  autoId += 1;
  const startOffset = o.startOffsetHours ?? 48; // default: 2 days out
  const duration = o.durationHours ?? 6;
  const start = new Date(NOW.getTime() + startOffset * H);
  const end = new Date(start.getTime() + duration * H);
  return {
    id: o.id ?? `s-${autoId}`,
    date: start.toISOString().slice(0, 10),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    role: o.role ?? 'Server',
    assignedUserId: o.assignedUserId ?? 'u-maya',
    claimedByUserId: o.claimedByUserId ?? null,
    status: o.status ?? 'Active',
  };
}

export function stateWith(...shifts: Shift[]): ShiftsState {
  return {
    users,
    shifts: Object.fromEntries(shifts.map((s) => [s.id, s])),
  };
}
