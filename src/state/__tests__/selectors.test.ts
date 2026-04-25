import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  boardForUser,
  hasOverlapForUser,
  isClaimEligible,
  pendingApprovalQueue,
  shiftHours,
  userCommittedShifts,
  weeklyHoursFor,
  wouldExceedOvertime,
} from '../selectors';
import { NOW, makeShift, stateWith } from './fixtures';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('shiftHours', () => {
  it('returns the duration in hours', () => {
    expect(shiftHours(makeShift({ durationHours: 6 }))).toBe(6);
    expect(shiftHours(makeShift({ durationHours: 0.5 }))).toBe(0.5);
  });

  it('never returns negative values for bad inputs', () => {
    const s = makeShift({ durationHours: 4 });
    const backwards = { ...s, endTime: s.startTime, startTime: s.endTime };
    expect(shiftHours(backwards)).toBe(0);
  });
});

describe('userCommittedShifts', () => {
  it('includes assigned Active shifts', () => {
    const s = makeShift({ id: 's-1', assignedUserId: 'u-maya' });
    expect(userCommittedShifts(stateWith(s), 'u-maya').map((x) => x.id)).toEqual(
      ['s-1'],
    );
  });

  it('excludes Offered shifts owned by the user (they intend to hand them off)', () => {
    const s = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    expect(userCommittedShifts(stateWith(s), 'u-maya')).toEqual([]);
  });

  it('includes PendingApproval shifts the user has claimed', () => {
    const s = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
    });
    expect(userCommittedShifts(stateWith(s), 'u-alex').map((x) => x.id)).toEqual(
      ['s-1'],
    );
  });
});

describe('hasOverlapForUser', () => {
  it('detects overlap with an already-assigned shift', () => {
    const existing = makeShift({
      id: 's-existing',
      assignedUserId: 'u-alex',
      startOffsetHours: 48,
      durationHours: 8,
    });
    const candidate = makeShift({
      id: 's-cand',
      startOffsetHours: 50,
      durationHours: 8,
    });
    expect(
      hasOverlapForUser(stateWith(existing), 'u-alex', candidate),
    ).toBe(true);
  });

  // Bug 1 regression.
  it('detects overlap with a shift the user currently has pending approval on', () => {
    const pending = makeShift({
      id: 's-pending',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
      startOffsetHours: 48,
      durationHours: 8,
    });
    const candidate = makeShift({
      id: 's-cand',
      startOffsetHours: 50,
      durationHours: 8,
    });
    expect(hasOverlapForUser(stateWith(pending), 'u-alex', candidate)).toBe(
      true,
    );
  });

  it('does not treat the user own offered shift as an overlap', () => {
    const offered = makeShift({
      id: 's-offered',
      assignedUserId: 'u-maya',
      status: 'Offered',
      startOffsetHours: 48,
      durationHours: 8,
    });
    const candidate = makeShift({
      id: 's-cand',
      startOffsetHours: 50,
      durationHours: 8,
    });
    expect(hasOverlapForUser(stateWith(offered), 'u-maya', candidate)).toBe(
      false,
    );
  });

  it('does not count the candidate itself as an overlap', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      startOffsetHours: 48,
      durationHours: 8,
    });
    expect(hasOverlapForUser(stateWith(shift), 'u-maya', shift)).toBe(false);
  });
});

describe('isClaimEligible / boardForUser', () => {
  it('hides Offered shifts from users with the wrong role', () => {
    const serverShift = makeShift({
      id: 's-1',
      role: 'Server',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    expect(isClaimEligible(stateWith(serverShift), 'u-jules', serverShift)).toBe(
      false,
    );
    expect(boardForUser(stateWith(serverShift), 'u-jules')).toEqual([]);
  });

  it('hides Offered shifts that overlap the viewer existing schedule', () => {
    const existing = makeShift({
      id: 's-existing',
      assignedUserId: 'u-alex',
      startOffsetHours: 48,
      durationHours: 8,
    });
    const offered = makeShift({
      id: 's-offered',
      assignedUserId: 'u-maya',
      role: 'Server',
      status: 'Offered',
      startOffsetHours: 50,
      durationHours: 8,
    });
    expect(boardForUser(stateWith(existing, offered), 'u-alex')).toEqual([]);
  });

  it('hides Offered shifts owned by the viewer themselves', () => {
    const offered = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    expect(boardForUser(stateWith(offered), 'u-maya')).toEqual([]);
  });

  it('shows matching Offered shifts to eligible peers', () => {
    const offered = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      role: 'Server',
      status: 'Offered',
    });
    expect(boardForUser(stateWith(offered), 'u-alex').map((s) => s.id)).toEqual([
      's-1',
    ]);
  });
});

describe('pendingApprovalQueue', () => {
  it('returns only PendingApproval shifts, sorted by start time', () => {
    const p2 = makeShift({
      id: 's-p2',
      status: 'PendingApproval',
      claimedByUserId: 'u-alex',
      startOffsetHours: 72,
    });
    const p1 = makeShift({
      id: 's-p1',
      status: 'PendingApproval',
      claimedByUserId: 'u-alex',
      startOffsetHours: 24,
    });
    const active = makeShift({ id: 's-active' });
    const queue = pendingApprovalQueue(stateWith(p2, p1, active)).map(
      (s) => s.id,
    );
    expect(queue).toEqual(['s-p1', 's-p2']);
  });
});

describe('weeklyHoursFor / wouldExceedOvertime', () => {
  it('weeklyHoursFor defaults to the current week when no reference date is passed', () => {
    const thisWeek = makeShift({
      id: 's-this',
      assignedUserId: 'u-maya',
      startOffsetHours: 0,
      durationHours: 8,
    });
    const nextWeek = makeShift({
      id: 's-next',
      assignedUserId: 'u-maya',
      startOffsetHours: 24 * 9, // ~9 days out
      durationHours: 8,
    });
    expect(weeklyHoursFor(stateWith(thisWeek, nextWeek), 'u-maya')).toBe(8);
  });

  it('weeklyHoursFor computes hours for the week containing the reference date', () => {
    const thisWeek = makeShift({
      id: 's-this',
      assignedUserId: 'u-maya',
      startOffsetHours: 0,
      durationHours: 8,
    });
    const nextWeek = makeShift({
      id: 's-next',
      assignedUserId: 'u-maya',
      startOffsetHours: 24 * 9,
      durationHours: 8,
    });
    expect(
      weeklyHoursFor(
        stateWith(thisWeek, nextWeek),
        'u-maya',
        new Date(nextWeek.startTime),
      ),
    ).toBe(8);
  });

  // Bug 2 regression. Overtime for a candidate shift must be computed
  // against the week that shift falls in, not today.
  it('wouldExceedOvertime uses the candidate shift week, not today', () => {
    // NOW is Wed 2026-05-13. The next ISO week runs Mon 2026-05-18 → Mon
    // 2026-05-25 (exclusive). 120h = Mon 2026-05-18 12:00Z, so shifts at
    // offsets 120 + {0,24,48,72,96} all land in that same next week, with
    // the candidate on Saturday of the same week.
    const nextWeekBase = 24 * 5;
    const nextWeekShifts = Array.from({ length: 5 }).map((_, i) =>
      makeShift({
        id: `s-n${i}`,
        assignedUserId: 'u-sam',
        role: 'Bartender',
        startOffsetHours: nextWeekBase + i * 24,
        durationHours: 8,
      }),
    );
    const candidate = makeShift({
      id: 's-cand',
      role: 'Bartender',
      assignedUserId: 'u-maya',
      startOffsetHours: nextWeekBase + 5 * 24, // Saturday of the same week
      durationHours: 4,
    });
    const state = stateWith(...nextWeekShifts, candidate);
    expect(wouldExceedOvertime(state, 'u-sam', candidate)).toBe(true);
  });

  it('wouldExceedOvertime does NOT fire when current-week hours are irrelevant to next-week shift', () => {
    // Sam has 40h THIS week, but candidate is in a different week.
    const thisWeekShifts = Array.from({ length: 5 }).map((_, i) =>
      makeShift({
        id: `s-t${i}`,
        assignedUserId: 'u-sam',
        role: 'Bartender',
        startOffsetHours: 0 + i * 12,
        durationHours: 8,
      }),
    );
    const nextWeekBase = 24 * 7; // crosses into next ISO week
    const candidate = makeShift({
      id: 's-cand',
      role: 'Bartender',
      assignedUserId: 'u-maya',
      startOffsetHours: nextWeekBase,
      durationHours: 4,
    });
    const state = stateWith(...thisWeekShifts, candidate);
    expect(wouldExceedOvertime(state, 'u-sam', candidate)).toBe(false);
  });
});
