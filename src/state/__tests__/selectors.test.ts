import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  boardForUser,
  hasOverlapForUser,
  isClaimEligible,
  pendingApprovalQueue,
  shiftHours,
  shiftsByDayInWeek,
  userCommittedShifts,
  weekStartLocal,
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

describe('weekStartLocal', () => {
  it('snaps to Monday 00:00 of the same calendar week', () => {
    // 2026-05-13 is a Wednesday in any TZ within reasonable bounds.
    const wed = new Date('2026-05-13T15:30:00');
    const start = weekStartLocal(wed);
    expect(start.getDay()).toBe(1); // Monday
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    // Same week.
    expect(start.getDate()).toBeLessThanOrEqual(wed.getDate());
    expect(wed.getTime() - start.getTime()).toBeLessThan(7 * 24 * 60 * 60 * 1000);
  });

  it('handles Sunday by going back 6 days, not forward 1', () => {
    const sun = new Date('2026-05-17T10:00:00');
    expect(sun.getDay()).toBe(0);
    const start = weekStartLocal(sun);
    expect(start.getDay()).toBe(1);
    expect((sun.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)).toBeCloseTo(
      6,
      0,
    );
  });
});

describe('shiftsByDayInWeek', () => {
  it('returns 7 day buckets keyed by local YYYY-MM-DD', () => {
    const start = weekStartLocal(NOW);
    const buckets = shiftsByDayInWeek(stateWith(), start);
    expect(buckets).toHaveLength(7);
    // Each bucket label is one day after the previous.
    for (let i = 1; i < buckets.length; i += 1) {
      const prev = new Date(`${buckets[i - 1].date}T00:00:00`);
      const cur = new Date(`${buckets[i].date}T00:00:00`);
      expect(
        Math.round((cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)),
      ).toBe(1);
    }
  });

  it('groups shifts into the bucket for the start time’s local day', () => {
    // NOW = Wed 2026-05-13 12:00 UTC (anchor). Place two shifts on
    // different days inside that ISO week and one outside it.
    const inside = makeShift({
      id: 's-in-1',
      assignedUserId: 'u-maya',
      startOffsetHours: 3, // same day as NOW
      durationHours: 4,
    });
    const inside2 = makeShift({
      id: 's-in-2',
      assignedUserId: 'u-alex',
      startOffsetHours: 27, // ~next day
      durationHours: 5,
    });
    const outside = makeShift({
      id: 's-out',
      assignedUserId: 'u-jules',
      startOffsetHours: 24 * 14, // two weeks out
      durationHours: 4,
    });
    const state = stateWith(inside, inside2, outside);
    const start = weekStartLocal(NOW);
    const buckets = shiftsByDayInWeek(state, start);
    const all = buckets.flatMap((b) => b.shifts.map((s) => s.id));
    expect(all).toContain('s-in-1');
    expect(all).toContain('s-in-2');
    expect(all).not.toContain('s-out');
  });

  it('sorts shifts within a day ascending by start time', () => {
    const morning = makeShift({
      id: 's-am',
      assignedUserId: 'u-maya',
      startOffsetHours: 4,
      durationHours: 3,
    });
    const evening = makeShift({
      id: 's-pm',
      assignedUserId: 'u-alex',
      startOffsetHours: 10,
      durationHours: 3,
    });
    // Insert evening first to make sure ordering isn't insertion-order.
    const state = stateWith(evening, morning);
    const start = weekStartLocal(NOW);
    const buckets = shiftsByDayInWeek(state, start);
    const todayBucket = buckets.find((b) => b.shifts.length >= 2);
    expect(todayBucket).toBeDefined();
    if (todayBucket) {
      expect(todayBucket.shifts.map((s) => s.id)).toEqual(['s-am', 's-pm']);
    }
  });

  it('returns empty arrays (not missing days) for days with no shifts', () => {
    const buckets = shiftsByDayInWeek(stateWith(), weekStartLocal(NOW));
    expect(buckets.every((b) => Array.isArray(b.shifts))).toBe(true);
  });
});
