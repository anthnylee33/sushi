import type {
  Shift,
  ShiftAction,
  ShiftsState,
  TimeOffRequest,
} from '../types';
import { hasOverlapForUser } from './selectors';

function setShift(
  state: ShiftsState,
  shiftId: string,
  patch: Partial<Shift>,
): ShiftsState {
  const existing = state.shifts[shiftId];
  if (!existing) return state;
  return {
    ...state,
    shifts: {
      ...state.shifts,
      [shiftId]: { ...existing, ...patch },
    },
  };
}

function setTimeOff(
  state: ShiftsState,
  requestId: string,
  patch: Partial<TimeOffRequest>,
): ShiftsState {
  const existing = state.timeOff[requestId];
  if (!existing) return state;
  return {
    ...state,
    timeOff: {
      ...state.timeOff,
      [requestId]: { ...existing, ...patch },
    },
  };
}

function isUpcoming(shift: Shift): boolean {
  return new Date(shift.startTime).getTime() >= Date.now();
}

/** YYYY-MM-DD, no timezone wobble — just check lexicographic ordering. */
function isValidDateRange(start: string, end: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(end) &&
    start <= end
  );
}

/**
 * Pure reducer. Every action is a guarded transition from the spec's
 * transition table. Any guard failure returns `state` unchanged (no-op),
 * which means stale UI never causes invalid mutations.
 *
 * Crucially: `assignedUserId` is mutated in EXACTLY ONE place (APPROVE).
 * That, plus the synchronous nature of useReducer, is what guarantees
 * a shift can never be assigned to two users.
 */
export function shiftsReducer(
  state: ShiftsState,
  action: ShiftAction,
): ShiftsState {
  switch (action.type) {
    case 'NEED_COVERAGE': {
      const shift = state.shifts[action.shiftId];
      if (!shift) return state;
      if (shift.status !== 'Active') return state;
      if (shift.assignedUserId !== action.actorId) return state;
      if (!isUpcoming(shift)) return state;
      return setShift(state, shift.id, { status: 'Offered' });
    }

    case 'WITHDRAW': {
      const shift = state.shifts[action.shiftId];
      if (!shift) return state;
      if (shift.status !== 'Offered') return state;
      if (shift.assignedUserId !== action.actorId) return state;
      return setShift(state, shift.id, { status: 'Active' });
    }

    case 'CLAIM': {
      const shift = state.shifts[action.shiftId];
      if (!shift) return state;
      if (shift.status !== 'Offered') return state;
      if (shift.claimedByUserId !== null) return state;
      if (shift.assignedUserId === action.actorId) return state;
      if (!isUpcoming(shift)) return state;
      const claimer = state.users[action.actorId];
      if (!claimer) return state;
      if (claimer.role !== shift.role) return state;
      if (hasOverlapForUser(state, action.actorId, shift)) return state;
      return setShift(state, shift.id, {
        status: 'PendingApproval',
        claimedByUserId: action.actorId,
      });
    }

    case 'CANCEL_CLAIM': {
      const shift = state.shifts[action.shiftId];
      if (!shift) return state;
      if (shift.status !== 'PendingApproval') return state;
      if (shift.claimedByUserId !== action.actorId) return state;
      return setShift(state, shift.id, {
        status: 'Offered',
        claimedByUserId: null,
      });
    }

    case 'APPROVE': {
      const shift = state.shifts[action.shiftId];
      if (!shift) return state;
      if (shift.status !== 'PendingApproval') return state;
      if (shift.claimedByUserId === null) return state;
      const claimer = state.users[shift.claimedByUserId];
      if (!claimer) return state;
      // Defense-in-depth role re-check.
      if (claimer.role !== shift.role) return state;
      // Defense-in-depth overlap re-check: a second concurrent pending claim
      // on an overlapping shift must not slip past approval.
      if (hasOverlapForUser(state, shift.claimedByUserId, shift)) return state;
      return setShift(state, shift.id, {
        assignedUserId: shift.claimedByUserId,
        claimedByUserId: null,
        status: 'Active',
      });
    }

    case 'DENY': {
      const shift = state.shifts[action.shiftId];
      if (!shift) return state;
      if (shift.status !== 'PendingApproval') return state;
      return setShift(state, shift.id, {
        status: 'Offered',
        claimedByUserId: null,
      });
    }

    case 'TIME_OFF_REQUEST': {
      if (state.timeOff[action.requestId]) return state; // idempotent on retry
      if (!state.users[action.actorId]) return state;
      if (!isValidDateRange(action.startDate, action.endDate)) return state;
      if (action.reason.trim().length === 0) return state;
      const request: TimeOffRequest = {
        id: action.requestId,
        userId: action.actorId,
        startDate: action.startDate,
        endDate: action.endDate,
        reason: action.reason.trim(),
        status: 'Pending',
        createdAt: action.createdAt ?? new Date().toISOString(),
      };
      return {
        ...state,
        timeOff: { ...state.timeOff, [action.requestId]: request },
      };
    }

    case 'TIME_OFF_CANCEL': {
      const req = state.timeOff[action.requestId];
      if (!req) return state;
      if (req.status !== 'Pending') return state;
      if (req.userId !== action.actorId) return state;
      const next = { ...state.timeOff };
      delete next[action.requestId];
      return { ...state, timeOff: next };
    }

    case 'TIME_OFF_APPROVE': {
      const req = state.timeOff[action.requestId];
      if (!req) return state;
      if (req.status !== 'Pending') return state;
      return setTimeOff(state, action.requestId, { status: 'Approved' });
    }

    case 'TIME_OFF_DENY': {
      const req = state.timeOff[action.requestId];
      if (!req) return state;
      if (req.status !== 'Pending') return state;
      return setTimeOff(state, action.requestId, { status: 'Denied' });
    }
  }

  // Defensive fallthrough: if a new action variant is added to ShiftAction
  // without a matching case, `useReducer` must still get a defined state
  // back (tsconfig doesn't enable `noImplicitReturns` or `strict`, so TS
  // won't catch the omission at compile time).
  return state;
}
