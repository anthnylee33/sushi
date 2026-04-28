import { useMemo, useState } from 'react';
import type { User } from '../types';
import { Button } from './Button';
import { useShifts } from '../state/ShiftsContext';
import { useToast } from '../state/ToastContext';

function todayYmd(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Combines a `<input type="date">` value (YYYY-MM-DD) and `<input type="time">`
 * value (HH:MM) into a Date interpreted in the *local* timezone — same as the
 * time picker shows. We then serialize to ISO to feed the reducer.
 */
function combineLocalDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  // `new Date('YYYY-MM-DDTHH:MM')` parses as local time per ECMA-262.
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface Props {
  onClose: () => void;
}

export function CreateShiftForm({ onClose }: Props) {
  const { state, tryDispatch } = useShifts();
  const { showToast } = useToast();

  const sortedUsers = useMemo<User[]>(
    () =>
      Object.values(state.users).sort((a, b) => a.name.localeCompare(b.name)),
    [state.users],
  );

  const [assignedUserId, setAssignedUserId] = useState(
    sortedUsers[0]?.id ?? '',
  );
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayYmd(), []);
  const assignee = state.users[assignedUserId];

  const submit = () => {
    if (!assignedUserId) {
      setError('Pick a person to assign.');
      return;
    }
    const start = combineLocalDateTime(date, startTime);
    const end = combineLocalDateTime(date, endTime);
    if (!start || !end) {
      setError('Pick a date, start time, and end time.');
      return;
    }
    if (end.getTime() <= start.getTime()) {
      setError('End time must be after start time.');
      return;
    }
    if (start.getTime() < Date.now()) {
      setError("Start time can't be in the past.");
      return;
    }

    const ok = tryDispatch({
      type: 'CREATE_SHIFT',
      shiftId: generateId(),
      assignedUserId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
    if (ok) {
      const name = state.users[assignedUserId]?.name ?? 'staff';
      showToast(`Shift added to ${name}'s schedule`, 'success');
      onClose();
    } else {
      // Most common reason left after the client-side checks above is an
      // overlap with another commitment for that user.
      setError(
        "Couldn't add — this overlaps with a shift that person is already on.",
      );
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-base font-semibold text-slate-900">New shift</div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Assign to</span>
        <select
          value={assignedUserId}
          onChange={(e) => setAssignedUserId(e.target.value)}
          className="h-11 rounded-xl bg-slate-50 px-3 text-base text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          required
        >
          {sortedUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
        {assignee && (
          <span className="text-xs text-slate-500">
            Role auto-set to {assignee.role}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Date</span>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 rounded-xl bg-slate-50 px-3 text-base text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Start</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 rounded-xl bg-slate-50 px-3 text-base text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">End</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-11 rounded-xl bg-slate-50 px-3 text-base text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Add shift
        </Button>
      </div>
    </form>
  );
}
