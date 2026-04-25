import type { Shift, ShiftsState, TimeOffRequest } from '../types';

export function shiftHours(shift: Shift): number {
  const start = new Date(shift.startTime).getTime();
  const end = new Date(shift.endTime).getTime();
  return Math.max(0, (end - start) / 3_600_000);
}

function isUpcoming(shift: Shift, now = new Date()): boolean {
  return new Date(shift.startTime).getTime() >= now.getTime();
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Week starts Monday.
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

export function shiftsOverlap(a: Shift, b: Shift): boolean {
  const aStart = new Date(a.startTime).getTime();
  const aEnd = new Date(a.endTime).getTime();
  const bStart = new Date(b.startTime).getTime();
  const bEnd = new Date(b.endTime).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function listShifts(state: ShiftsState): Shift[] {
  return Object.values(state.shifts);
}

export function nextShiftForUser(
  state: ShiftsState,
  userId: string,
): Shift | undefined {
  return listShifts(state)
    .filter((s) => s.assignedUserId === userId && isUpcoming(s))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )[0];
}

export function myScheduleForUser(
  state: ShiftsState,
  userId: string,
): Shift[] {
  return listShifts(state)
    .filter((s) => s.assignedUserId === userId && isUpcoming(s))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}

/**
 * Any shift that counts as a "commitment" for this user — they are currently
 * assigned to it (Active or Offered shifts they own, where Offered means still
 * theirs until someone claims), or they have a pending claim on it. Offered
 * shifts they own do NOT count as conflicts because they intend to hand them
 * off; everything else does.
 */
export function userCommittedShifts(
  state: ShiftsState,
  userId: string,
): Shift[] {
  return listShifts(state).filter((s) => {
    if (s.assignedUserId === userId && s.status !== 'Offered') return true;
    if (s.claimedByUserId === userId && s.status === 'PendingApproval')
      return true;
    return false;
  });
}

export function hasOverlapForUser(
  state: ShiftsState,
  userId: string,
  candidate: Shift,
): boolean {
  return userCommittedShifts(state, userId).some(
    (s) => s.id !== candidate.id && shiftsOverlap(s, candidate),
  );
}

export function isClaimEligible(
  state: ShiftsState,
  userId: string,
  shift: Shift,
): boolean {
  if (shift.status !== 'Offered') return false;
  if (shift.assignedUserId === userId) return false;
  const user = state.users[userId];
  if (!user || user.role !== shift.role) return false;
  if (!isUpcoming(shift)) return false;
  if (hasOverlapForUser(state, userId, shift)) return false;
  return true;
}

export function boardForUser(state: ShiftsState, userId: string): Shift[] {
  return listShifts(state)
    .filter((s) => s.status === 'Offered' && isClaimEligible(state, userId, s))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}

export function pendingApprovalQueue(state: ShiftsState): Shift[] {
  return listShifts(state)
    .filter((s) => s.status === 'PendingApproval')
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}

/**
 * Sum of hours the user is assigned for the week containing `referenceDate`.
 * Defaults to "today" for the visible-in-UI case; the reducer/overtime check
 * pass the candidate shift's date so cross-week swaps aren't mixed together.
 */
export function weeklyHoursFor(
  state: ShiftsState,
  userId: string,
  referenceDate: Date = new Date(),
): number {
  const weekStart = startOfWeek(referenceDate).getTime();
  const weekEnd = endOfWeek(referenceDate).getTime();
  return listShifts(state)
    .filter((s) => s.assignedUserId === userId)
    .filter((s) => {
      const t = new Date(s.startTime).getTime();
      return t >= weekStart && t < weekEnd;
    })
    .reduce((sum, s) => sum + shiftHours(s), 0);
}

export function wouldExceedOvertime(
  state: ShiftsState,
  userId: string,
  shift: Shift,
): boolean {
  const shiftWeek = new Date(shift.startTime);
  const projected =
    weeklyHoursFor(state, userId, shiftWeek) + shiftHours(shift);
  return projected > 40;
}

/** Newest requests first. */
function sortByCreatedDesc(a: TimeOffRequest, b: TimeOffRequest): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/** Oldest pending first (FIFO for the manager queue). */
function sortByCreatedAsc(a: TimeOffRequest, b: TimeOffRequest): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function listTimeOff(state: ShiftsState): TimeOffRequest[] {
  return Object.values(state.timeOff);
}

export function timeOffForUser(
  state: ShiftsState,
  userId: string,
): TimeOffRequest[] {
  return listTimeOff(state)
    .filter((r) => r.userId === userId)
    .sort(sortByCreatedDesc);
}

export function pendingTimeOffQueue(state: ShiftsState): TimeOffRequest[] {
  return listTimeOff(state)
    .filter((r) => r.status === 'Pending')
    .sort(sortByCreatedAsc);
}

/**
 * Count of a user's assigned shifts that fall inside a [startDate, endDate]
 * range (both inclusive, YYYY-MM-DD). Used to warn managers when approving
 * time off would leave assigned shifts uncovered.
 */
export function assignedShiftsInRange(
  state: ShiftsState,
  userId: string,
  startDate: string,
  endDate: string,
): Shift[] {
  return listShifts(state)
    .filter((s) => s.assignedUserId === userId)
    .filter((s) => s.date >= startDate && s.date <= endDate);
}
