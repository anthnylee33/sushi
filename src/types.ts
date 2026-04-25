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

export interface ShiftsState {
  users: Record<string, User>;
  shifts: Record<string, Shift>;
}

export type ShiftAction =
  | { type: 'NEED_COVERAGE'; shiftId: string; actorId: string }
  | { type: 'WITHDRAW'; shiftId: string; actorId: string }
  | { type: 'CLAIM'; shiftId: string; actorId: string }
  | { type: 'CANCEL_CLAIM'; shiftId: string; actorId: string }
  | { type: 'APPROVE'; shiftId: string }
  | { type: 'DENY'; shiftId: string };
