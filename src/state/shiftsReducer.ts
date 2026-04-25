import type { Shift, ShiftAction, ShiftsState } from '../types';
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

function isUpcoming(shift: Shift): boolean {
  return new Date(shift.startTime).getTime() >= Date.now();
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
  const shift = state.shifts[action.shiftId];
  if (!shift) return state;

  switch (action.type) {
    case 'NEED_COVERAGE': {
      if (shift.status !== 'Active') return state;
      if (shift.assignedUserId !== action.actorId) return state;
      if (!isUpcoming(shift)) return state;
      return setShift(state, shift.id, { status: 'Offered' });
    }

    case 'WITHDRAW': {
      if (shift.status !== 'Offered') return state;
      if (shift.assignedUserId !== action.actorId) return state;
      return setShift(state, shift.id, { status: 'Active' });
    }

    case 'CLAIM': {
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
      if (shift.status !== 'PendingApproval') return state;
      if (shift.claimedByUserId !== action.actorId) return state;
      return setShift(state, shift.id, {
        status: 'Offered',
        claimedByUserId: null,
      });
    }

    case 'APPROVE': {
      if (shift.status !== 'PendingApproval') return state;
      if (shift.claimedByUserId === null) return state;
      const claimer = state.users[shift.claimedByUserId];
      if (!claimer) return state;
      // Defense-in-depth role re-check.
      if (claimer.role !== shift.role) return state;
      return setShift(state, shift.id, {
        assignedUserId: shift.claimedByUserId,
        claimedByUserId: null,
        status: 'Active',
      });
    }

    case 'DENY': {
      if (shift.status !== 'PendingApproval') return state;
      return setShift(state, shift.id, {
        status: 'Offered',
        claimedByUserId: null,
      });
    }

    default:
      return state;
  }
}
