import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { shiftsReducer } from '../shiftsReducer';
import { NOW, at, makeShift, stateWith } from './fixtures';

/**
 * The reducer is the single writer for shift state, and `assignedUserId`
 * mutates only in the APPROVE case. These tests lock down both the
 * happy-path transition table and every guard that keeps invalid transitions
 * from slipping through.
 */

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NEED_COVERAGE', () => {
  it('flips Active → Offered for the assignee', () => {
    const shift = makeShift({ id: 's-1', assignedUserId: 'u-maya' });
    const next = shiftsReducer(stateWith(shift), {
      type: 'NEED_COVERAGE',
      shiftId: 's-1',
      actorId: 'u-maya',
    });
    expect(next.shifts['s-1'].status).toBe('Offered');
    expect(next.shifts['s-1'].assignedUserId).toBe('u-maya');
  });

  it('is a no-op when the shift is already Offered', () => {
    const shift = makeShift({ id: 's-1', status: 'Offered' });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'NEED_COVERAGE',
      shiftId: 's-1',
      actorId: 'u-maya',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the actor is not the assignee', () => {
    const shift = makeShift({ id: 's-1', assignedUserId: 'u-maya' });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'NEED_COVERAGE',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the shift is in the past', () => {
    const shift = makeShift({ id: 's-1', startOffsetHours: -24 });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'NEED_COVERAGE',
      shiftId: 's-1',
      actorId: 'u-maya',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the shift id is unknown', () => {
    const state = stateWith(makeShift({ id: 's-1' }));
    const next = shiftsReducer(state, {
      type: 'NEED_COVERAGE',
      shiftId: 's-does-not-exist',
      actorId: 'u-maya',
    });
    expect(next).toBe(state);
  });
});

describe('WITHDRAW', () => {
  it('flips Offered → Active for the assignee', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    const next = shiftsReducer(stateWith(shift), {
      type: 'WITHDRAW',
      shiftId: 's-1',
      actorId: 'u-maya',
    });
    expect(next.shifts['s-1'].status).toBe('Active');
  });

  it('is a no-op when the shift is not Offered', () => {
    const shift = makeShift({ id: 's-1' });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'WITHDRAW',
      shiftId: 's-1',
      actorId: 'u-maya',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the actor is not the assignee', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'WITHDRAW',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next).toBe(state);
  });
});

describe('CLAIM', () => {
  it('flips Offered → PendingApproval and records claimer without touching assignedUserId', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    const next = shiftsReducer(stateWith(shift), {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next.shifts['s-1'].status).toBe('PendingApproval');
    expect(next.shifts['s-1'].claimedByUserId).toBe('u-alex');
    expect(next.shifts['s-1'].assignedUserId).toBe('u-maya');
  });

  it('is a no-op when the shift is already PendingApproval', () => {
    const shift = makeShift({
      id: 's-1',
      status: 'PendingApproval',
      claimedByUserId: 'u-alex',
    });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-jules',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the claimant would be claiming their own shift', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-maya',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the claimant has the wrong role', () => {
    const shift = makeShift({
      id: 's-1',
      role: 'Server',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-jules', // Bartender
    });
    expect(next).toBe(state);
  });

  it('is a no-op when claiming would overlap an already-assigned shift', () => {
    // Alex already holds s-existing covering hours 48-56.
    // Maya offers s-1 covering 50-58 — overlaps.
    const existing = makeShift({
      id: 's-existing',
      assignedUserId: 'u-alex',
      startOffsetHours: 48,
      durationHours: 8,
    });
    const offered = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
      startOffsetHours: 50,
      durationHours: 8,
    });
    const state = stateWith(existing, offered);
    const next = shiftsReducer(state, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next).toBe(state);
  });

  // Bug 1 regression. Before the fix, pending claims weren't counted as
  // commitments, so a user could queue up two overlapping pending claims.
  it('is a no-op when claiming would overlap a shift the user already has pending', () => {
    const pending = makeShift({
      id: 's-pending',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
      startOffsetHours: 48,
      durationHours: 8,
    });
    const offered = makeShift({
      id: 's-1',
      assignedUserId: 'u-jules',
      status: 'Offered',
      role: 'Server',
      startOffsetHours: 50,
      durationHours: 8,
    });
    // Jules is a Bartender in fixtures, so override to Server for this shift's
    // assignee role consistency — but we only need s-1 to be a Server shift
    // that Alex can claim. Reuse a server offerer:
    offered.assignedUserId = 'u-maya';
    const state = stateWith(pending, offered);
    const next = shiftsReducer(state, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the shift is in the past', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
      startOffsetHours: -24,
    });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next).toBe(state);
  });
});

describe('CANCEL_CLAIM', () => {
  it('flips PendingApproval → Offered and clears claimedByUserId', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
    });
    const next = shiftsReducer(stateWith(shift), {
      type: 'CANCEL_CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next.shifts['s-1'].status).toBe('Offered');
    expect(next.shifts['s-1'].claimedByUserId).toBe(null);
    expect(next.shifts['s-1'].assignedUserId).toBe('u-maya');
  });

  it('is a no-op when the actor is not the claimant', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
    });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'CANCEL_CLAIM',
      shiftId: 's-1',
      actorId: 'u-jules',
    });
    expect(next).toBe(state);
  });

  it('is a no-op when the shift is not PendingApproval', () => {
    const shift = makeShift({ id: 's-1' });
    const state = stateWith(shift);
    const next = shiftsReducer(state, {
      type: 'CANCEL_CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(next).toBe(state);
  });
});

describe('APPROVE', () => {
  it('reassigns the shift to the claimant, clears the claim, and returns to Active', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
    });
    const next = shiftsReducer(stateWith(shift), {
      type: 'APPROVE',
      shiftId: 's-1',
    });
    expect(next.shifts['s-1'].assignedUserId).toBe('u-alex');
    expect(next.shifts['s-1'].claimedByUserId).toBe(null);
    expect(next.shifts['s-1'].status).toBe('Active');
  });

  it('is a no-op when the shift is not PendingApproval', () => {
    const shift = makeShift({ id: 's-1', status: 'Offered' });
    const state = stateWith(shift);
    const next = shiftsReducer(state, { type: 'APPROVE', shiftId: 's-1' });
    expect(next).toBe(state);
  });

  it('is a no-op when the claimant role no longer matches the shift role', () => {
    const shift = makeShift({
      id: 's-1',
      role: 'Server',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-jules', // Bartender (hypothetical: role changed between claim and approve)
      status: 'PendingApproval',
    });
    const state = stateWith(shift);
    const next = shiftsReducer(state, { type: 'APPROVE', shiftId: 's-1' });
    expect(next).toBe(state);
  });

  // Bug 1 regression. Even if two overlapping pending claims somehow exist
  // at the same time (e.g. stale client state), approving the second one
  // must not produce a double-booking.
  it('is a no-op when approval would overlap a shift already assigned to the claimant', () => {
    const already = makeShift({
      id: 's-existing',
      assignedUserId: 'u-alex',
      startOffsetHours: 48,
      durationHours: 8,
    });
    const pending = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
      startOffsetHours: 50,
      durationHours: 8,
    });
    const state = stateWith(already, pending);
    const next = shiftsReducer(state, { type: 'APPROVE', shiftId: 's-1' });
    expect(next).toBe(state);
    // Neither shift was mutated.
    expect(next.shifts['s-1'].assignedUserId).toBe('u-maya');
    expect(next.shifts['s-1'].status).toBe('PendingApproval');
  });
});

describe('DENY', () => {
  it('flips PendingApproval → Offered and clears claimedByUserId', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      claimedByUserId: 'u-alex',
      status: 'PendingApproval',
    });
    const next = shiftsReducer(stateWith(shift), {
      type: 'DENY',
      shiftId: 's-1',
    });
    expect(next.shifts['s-1'].status).toBe('Offered');
    expect(next.shifts['s-1'].claimedByUserId).toBe(null);
    expect(next.shifts['s-1'].assignedUserId).toBe('u-maya');
  });

  it('is a no-op when the shift is not PendingApproval', () => {
    const shift = makeShift({ id: 's-1', status: 'Active' });
    const state = stateWith(shift);
    const next = shiftsReducer(state, { type: 'DENY', shiftId: 's-1' });
    expect(next).toBe(state);
  });
});

describe('invariants', () => {
  it('a shift sequentially offered then claimed cannot be claimed a second time', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
      status: 'Offered',
    });
    const claimed = shiftsReducer(stateWith(shift), {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(claimed.shifts['s-1'].claimedByUserId).toBe('u-alex');

    // Jules is a Bartender — role mismatch would already block — but the
    // status guard should fail first. Swap users to Alex peer ('u-maya' is
    // the original owner, so try another Server if there was one). Our
    // fixture has Alex as the only other Server; so use Alex again to
    // exercise the status guard itself.
    const attempted = shiftsReducer(claimed, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(attempted).toBe(claimed);
  });

  it('assignedUserId changes in exactly one APPROVE call across a full lifecycle', () => {
    const shift = makeShift({
      id: 's-1',
      assignedUserId: 'u-maya',
    });
    const afterOffer = shiftsReducer(stateWith(shift), {
      type: 'NEED_COVERAGE',
      shiftId: 's-1',
      actorId: 'u-maya',
    });
    expect(afterOffer.shifts['s-1'].assignedUserId).toBe('u-maya');

    const afterClaim = shiftsReducer(afterOffer, {
      type: 'CLAIM',
      shiftId: 's-1',
      actorId: 'u-alex',
    });
    expect(afterClaim.shifts['s-1'].assignedUserId).toBe('u-maya');

    const afterApprove = shiftsReducer(afterClaim, {
      type: 'APPROVE',
      shiftId: 's-1',
    });
    expect(afterApprove.shifts['s-1'].assignedUserId).toBe('u-alex');
    expect(afterApprove.shifts['s-1'].claimedByUserId).toBe(null);
    expect(afterApprove.shifts['s-1'].status).toBe('Active');
  });
});

describe('CREATE_SHIFT', () => {
  it('adds an Active shift assigned to the chosen user; role auto-derives from the user', () => {
    const next = shiftsReducer(stateWith(), {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-jules',
      startTime: at(48),
      endTime: at(54),
    });
    const shift = next.shifts['s-new'];
    expect(shift).toBeDefined();
    expect(shift.assignedUserId).toBe('u-jules');
    expect(shift.role).toBe('Bartender');
    expect(shift.status).toBe('Active');
    expect(shift.claimedByUserId).toBe(null);
  });

  it('rejects an unknown user', () => {
    const before = stateWith();
    const after = shiftsReducer(before, {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-ghost',
      startTime: at(48),
      endTime: at(54),
    });
    expect(after).toBe(before);
  });

  it('rejects when end is not after start', () => {
    const before = stateWith();
    const after = shiftsReducer(before, {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-maya',
      startTime: at(48),
      endTime: at(48),
    });
    expect(after).toBe(before);
  });

  it('rejects back-dated shifts (start in the past)', () => {
    const before = stateWith();
    const after = shiftsReducer(before, {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-maya',
      startTime: at(-2), // 2 hours before NOW
      endTime: at(4),
    });
    expect(after).toBe(before);
  });

  it('rejects when the new shift overlaps an existing assignment', () => {
    const existing = makeShift({
      id: 's-exist',
      assignedUserId: 'u-maya',
      startOffsetHours: 48,
      durationHours: 6,
    });
    const before = stateWith(existing);
    const after = shiftsReducer(before, {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-maya',
      startTime: at(50), // overlaps the existing 48..54 window
      endTime: at(56),
    });
    expect(after).toBe(before);
  });

  it('rejects when the new shift overlaps a pending claim by the same user', () => {
    // Maya has a pending claim on a shift offered by Alex; that's a commitment
    // for Maya, so a manager-created overlapping shift on Maya must be rejected.
    const claimed = makeShift({
      id: 's-claimed',
      assignedUserId: 'u-alex',
      claimedByUserId: 'u-maya',
      status: 'PendingApproval',
      startOffsetHours: 48,
      durationHours: 6,
    });
    const before = stateWith(claimed);
    const after = shiftsReducer(before, {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-maya',
      startTime: at(50),
      endTime: at(56),
    });
    expect(after).toBe(before);
  });

  it('is idempotent on duplicate id', () => {
    const first = shiftsReducer(stateWith(), {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-maya',
      startTime: at(48),
      endTime: at(54),
    });
    const second = shiftsReducer(first, {
      type: 'CREATE_SHIFT',
      shiftId: 's-new',
      assignedUserId: 'u-jules', // different user; should still no-op
      startTime: at(72),
      endTime: at(78),
    });
    expect(second).toBe(first);
  });

  it('non-overlapping back-to-back shifts are allowed', () => {
    const first = makeShift({
      id: 's-a',
      assignedUserId: 'u-maya',
      startOffsetHours: 48,
      durationHours: 6,
    });
    const before = stateWith(first);
    const after = shiftsReducer(before, {
      type: 'CREATE_SHIFT',
      shiftId: 's-b',
      assignedUserId: 'u-maya',
      startTime: at(54), // exactly when s-a ends
      endTime: at(60),
    });
    expect(after.shifts['s-b']).toBeDefined();
    expect(after.shifts['s-b'].status).toBe('Active');
  });
});
