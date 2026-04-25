import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shiftsReducer } from '../shiftsReducer';
import {
  assignedShiftsInRange,
  pendingTimeOffQueue,
  timeOffForUser,
} from '../selectors';
import { NOW, makeShift, makeTimeOff, stateWithAll } from './fixtures';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TIME_OFF_REQUEST', () => {
  it('creates a pending request with trimmed reason and provided createdAt', () => {
    const state = stateWithAll([], []);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_REQUEST',
      requestId: 'to-new',
      actorId: 'u-maya',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      reason: '  Family wedding  ',
      createdAt: '2026-05-13T12:00:00.000Z',
    });
    expect(next.timeOff['to-new']).toEqual({
      id: 'to-new',
      userId: 'u-maya',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      reason: 'Family wedding',
      status: 'Pending',
      createdAt: '2026-05-13T12:00:00.000Z',
    });
  });

  it('is idempotent on retry with the same requestId', () => {
    const existing = makeTimeOff({ id: 'to-1' });
    const state = stateWithAll([], [existing]);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_REQUEST',
      requestId: 'to-1',
      actorId: 'u-alex',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      reason: 'Different reason',
    });
    expect(next).toBe(state);
  });

  it('rejects ranges where the end date is before the start date', () => {
    const state = stateWithAll([], []);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_REQUEST',
      requestId: 'to-new',
      actorId: 'u-maya',
      startDate: '2026-06-10',
      endDate: '2026-06-01',
      reason: 'Vacation',
    });
    expect(next).toBe(state);
  });

  it('rejects malformed date strings', () => {
    const state = stateWithAll([], []);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_REQUEST',
      requestId: 'to-new',
      actorId: 'u-maya',
      startDate: '2026/06/01',
      endDate: '2026/06/03',
      reason: 'Vacation',
    });
    expect(next).toBe(state);
  });

  it('rejects empty/whitespace reasons', () => {
    const state = stateWithAll([], []);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_REQUEST',
      requestId: 'to-new',
      actorId: 'u-maya',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      reason: '   ',
    });
    expect(next).toBe(state);
  });

  it('rejects unknown actors', () => {
    const state = stateWithAll([], []);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_REQUEST',
      requestId: 'to-new',
      actorId: 'u-ghost',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      reason: 'Vacation',
    });
    expect(next).toBe(state);
  });
});

describe('TIME_OFF_CANCEL', () => {
  it('removes a pending request for its own requester', () => {
    const req = makeTimeOff({ id: 'to-1', userId: 'u-maya' });
    const state = stateWithAll([], [req]);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_CANCEL',
      requestId: 'to-1',
      actorId: 'u-maya',
    });
    expect(next.timeOff['to-1']).toBeUndefined();
  });

  it('is a no-op for other users', () => {
    const req = makeTimeOff({ id: 'to-1', userId: 'u-maya' });
    const state = stateWithAll([], [req]);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_CANCEL',
      requestId: 'to-1',
      actorId: 'u-alex',
    });
    expect(next).toBe(state);
  });

  it('is a no-op after the request has been approved or denied', () => {
    const approved = makeTimeOff({
      id: 'to-1',
      userId: 'u-maya',
      status: 'Approved',
    });
    const state = stateWithAll([], [approved]);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_CANCEL',
      requestId: 'to-1',
      actorId: 'u-maya',
    });
    expect(next).toBe(state);
  });
});

describe('TIME_OFF_APPROVE / TIME_OFF_DENY', () => {
  it('approves a pending request', () => {
    const req = makeTimeOff({ id: 'to-1' });
    const state = stateWithAll([], [req]);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_APPROVE',
      requestId: 'to-1',
    });
    expect(next.timeOff['to-1'].status).toBe('Approved');
  });

  it('denies a pending request', () => {
    const req = makeTimeOff({ id: 'to-1' });
    const state = stateWithAll([], [req]);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_DENY',
      requestId: 'to-1',
    });
    expect(next.timeOff['to-1'].status).toBe('Denied');
  });

  it('cannot re-approve an already-resolved request', () => {
    const approved = makeTimeOff({ id: 'to-1', status: 'Approved' });
    const state = stateWithAll([], [approved]);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_APPROVE',
      requestId: 'to-1',
    });
    expect(next).toBe(state);
  });

  it('cannot deny an unknown request', () => {
    const state = stateWithAll([], []);
    const next = shiftsReducer(state, {
      type: 'TIME_OFF_DENY',
      requestId: 'to-nope',
    });
    expect(next).toBe(state);
  });
});

describe('time-off selectors', () => {
  it('timeOffForUser is sorted newest first', () => {
    const older = makeTimeOff({
      id: 'to-older',
      userId: 'u-maya',
      createdAt: '2026-05-01T00:00:00.000Z',
    });
    const newer = makeTimeOff({
      id: 'to-newer',
      userId: 'u-maya',
      createdAt: '2026-05-10T00:00:00.000Z',
    });
    const other = makeTimeOff({ id: 'to-other', userId: 'u-alex' });
    const state = stateWithAll([], [older, newer, other]);
    expect(timeOffForUser(state, 'u-maya').map((r) => r.id)).toEqual([
      'to-newer',
      'to-older',
    ]);
  });

  it('pendingTimeOffQueue is FIFO and only contains Pending', () => {
    const p1 = makeTimeOff({
      id: 'p1',
      status: 'Pending',
      createdAt: '2026-05-01T00:00:00.000Z',
    });
    const p2 = makeTimeOff({
      id: 'p2',
      status: 'Pending',
      createdAt: '2026-05-02T00:00:00.000Z',
    });
    const approved = makeTimeOff({ id: 'a1', status: 'Approved' });
    const state = stateWithAll([], [p2, p1, approved]);
    expect(pendingTimeOffQueue(state).map((r) => r.id)).toEqual(['p1', 'p2']);
  });

  it('assignedShiftsInRange returns only in-range assigned shifts', () => {
    const inRange = makeShift({
      id: 's-in',
      assignedUserId: 'u-maya',
      // Build a YYYY-MM-DD that matches the range below.
      startOffsetHours: 0,
    });
    // Force the shift's date to a known value to keep the test hermetic.
    const inRangeFixed = { ...inRange, date: '2026-06-02' };
    const beforeRange = { ...makeShift({ id: 's-before' }), date: '2026-05-31' };
    const afterRange = { ...makeShift({ id: 's-after' }), date: '2026-06-10' };
    const otherUser = {
      ...makeShift({ id: 's-other', assignedUserId: 'u-alex' }),
      date: '2026-06-02',
    };
    const state = stateWithAll([
      inRangeFixed,
      beforeRange,
      afterRange,
      otherUser,
    ]);
    expect(
      assignedShiftsInRange(state, 'u-maya', '2026-06-01', '2026-06-05').map(
        (s) => s.id,
      ),
    ).toEqual(['s-in']);
  });
});
