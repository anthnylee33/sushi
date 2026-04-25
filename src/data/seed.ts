import type { ShiftsState, User, Shift, TimeOffRequest } from '../types';

const users: User[] = [
  { id: 'u-maya', name: 'Maya Chen', role: 'Server' },
  { id: 'u-alex', name: 'Alex Rivera', role: 'Server' },
  { id: 'u-jules', name: 'Jules Park', role: 'Bartender' },
  { id: 'u-sam', name: 'Sam Okafor', role: 'Bartender' },
];

// Build dates relative to "today" so the demo is always meaningful.
function dayOffset(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function shift(
  id: string,
  daysFromNow: number,
  startHour: number,
  endHour: number,
  role: Shift['role'],
  assignedUserId: string,
  status: Shift['status'] = 'Active',
  claimedByUserId: string | null = null,
): Shift {
  const start = dayOffset(daysFromNow, startHour);
  const end = dayOffset(daysFromNow, endHour);
  return {
    id,
    date: dateOnly(start),
    startTime: start,
    endTime: end,
    role,
    assignedUserId,
    claimedByUserId,
    status,
  };
}

const shifts: Shift[] = [
  // Maya (Server) — full week of upcoming shifts
  shift('s-1', 1, 11, 17, 'Server', 'u-maya', 'Active'),
  shift('s-2', 2, 17, 23, 'Server', 'u-maya', 'Offered'), // already on the Board
  shift('s-3', 4, 11, 17, 'Server', 'u-maya', 'Active'),
  shift('s-4', 6, 17, 23, 'Server', 'u-maya', 'Active'),

  // Alex (Server)
  shift('s-5', 1, 17, 23, 'Server', 'u-alex', 'Active'),
  shift('s-6', 3, 11, 17, 'Server', 'u-alex', 'Active'),
  // Already pending: Alex offered, Maya claimed → manager queue has something on first load.
  shift('s-7', 5, 11, 17, 'Server', 'u-alex', 'PendingApproval', 'u-maya'),

  // Jules (Bartender)
  shift('s-8', 1, 18, 24, 'Bartender', 'u-jules', 'Active'),
  shift('s-9', 3, 18, 24, 'Bartender', 'u-jules', 'Offered'),
  shift('s-10', 5, 18, 24, 'Bartender', 'u-jules', 'Active'),

  // Sam (Bartender) — already at high hours so overtime warning fires.
  shift('s-11', 1, 12, 20, 'Bartender', 'u-sam', 'Active'),
  shift('s-12', 2, 12, 20, 'Bartender', 'u-sam', 'Active'),
  shift('s-13', 3, 12, 20, 'Bartender', 'u-sam', 'Active'),
  shift('s-14', 4, 12, 20, 'Bartender', 'u-sam', 'Active'),
  shift('s-15', 6, 12, 20, 'Bartender', 'u-sam', 'Active'),
];

function dateOnlyOffset(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function createdAtOffset(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

const timeOff: TimeOffRequest[] = [
  // Jules has a pending request spanning 10–12 days out — lands in the
  // manager queue on first load alongside the pending shift swap.
  {
    id: 'to-1',
    userId: 'u-jules',
    startDate: dateOnlyOffset(10),
    endDate: dateOnlyOffset(12),
    reason: 'Out of town for a wedding',
    status: 'Pending',
    createdAt: createdAtOffset(45),
  },
  // Maya has an already-approved request from last week — shows up in her
  // history list so the "approved" visual state is exercised on first load.
  {
    id: 'to-2',
    userId: 'u-maya',
    startDate: dateOnlyOffset(20),
    endDate: dateOnlyOffset(20),
    reason: 'Doctor appointment',
    status: 'Approved',
    createdAt: createdAtOffset(60 * 24 * 3),
  },
];

export const seedState: ShiftsState = {
  users: Object.fromEntries(users.map((u) => [u.id, u])),
  shifts: Object.fromEntries(shifts.map((s) => [s.id, s])),
  timeOff: Object.fromEntries(timeOff.map((r) => [r.id, r])),
};
