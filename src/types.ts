export type Role = 'Server' | 'Bartender';

export type ShiftStatus = 'Active' | 'Offered' | 'PendingApproval';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  role: Role;
  assignedUserId: string;
  claimedByUserId: string | null;
  status: ShiftStatus;
}

export type TimeOffStatus = 'Pending' | 'Approved' | 'Denied';

export interface TimeOffRequest {
  id: string;
  userId: string;
  /** YYYY-MM-DD, inclusive. */
  startDate: string;
  /** YYYY-MM-DD, inclusive. */
  endDate: string;
  reason: string;
  status: TimeOffStatus;
  /** ISO timestamp. */
  createdAt: string;
}

export interface ShiftsState {
  users: Record<string, User>;
  shifts: Record<string, Shift>;
  timeOff: Record<string, TimeOffRequest>;
}

export type ShiftAction =
  | { type: 'NEED_COVERAGE'; shiftId: string; actorId: string }
  | { type: 'WITHDRAW'; shiftId: string; actorId: string }
  | { type: 'CLAIM'; shiftId: string; actorId: string }
  | { type: 'CANCEL_CLAIM'; shiftId: string; actorId: string }
  | { type: 'APPROVE'; shiftId: string }
  | { type: 'DENY'; shiftId: string }
  | {
      type: 'TIME_OFF_REQUEST';
      requestId: string;
      actorId: string;
      startDate: string;
      endDate: string;
      reason: string;
      createdAt?: string;
    }
  | { type: 'TIME_OFF_CANCEL'; requestId: string; actorId: string }
  | { type: 'TIME_OFF_APPROVE'; requestId: string }
  | { type: 'TIME_OFF_DENY'; requestId: string }
  | {
      type: 'CREATE_SHIFT';
      shiftId: string;
      assignedUserId: string;
      startTime: string;
      endTime: string;
    };
