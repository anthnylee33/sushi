import { useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { useShifts } from '../state/ShiftsContext';
import {
  shiftHours,
  shiftsByDayInWeek,
  weekStartLocal,
} from '../state/selectors';
import type { Shift, ShiftStatus } from '../types';

const statusToTone: Record<
  ShiftStatus,
  'neutral' | 'amber' | 'blue' | 'green'
> = {
  Active: 'green',
  Offered: 'amber',
  PendingApproval: 'blue',
};

const statusToLabel: Record<ShiftStatus, string> = {
  Active: 'Scheduled',
  Offered: 'On The Board',
  PendingApproval: 'Swap pending',
};

const roleToTone: Record<string, 'indigo' | 'rose'> = {
  Server: 'indigo',
  Bartender: 'rose',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatRangeLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      start.getFullYear() === end.getFullYear() ? undefined : 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface ShiftRowProps {
  shift: Shift;
  assigneeName: string;
  claimerName?: string;
}

function ShiftRow({ shift, assigneeName, claimerName }: ShiftRowProps) {
  const roleTone = roleToTone[shift.role] ?? 'indigo';
  const accentBar =
    roleTone === 'indigo' ? 'bg-indigo-500' : 'bg-rose-500';
  return (
    <div className="flex items-stretch gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className={`w-1 shrink-0 rounded-full ${accentBar}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-base font-semibold text-slate-900">
            {assigneeName}
          </div>
          <div className="shrink-0 text-sm font-medium text-slate-600">
            {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {shift.role} · {shiftHours(shift)}h
            {claimerName && shift.status === 'PendingApproval' ? (
              <> · claim from {claimerName}</>
            ) : null}
          </span>
          <Badge tone={statusToTone[shift.status]}>
            {statusToLabel[shift.status]}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export function ManagerScheduleView() {
  const { state } = useShifts();

  // Anchor the week to the Monday containing `today`. Buttons shift the
  // anchor by ±7 days; "This week" resets to the current week.
  const [anchor, setAnchor] = useState<Date>(() => weekStartLocal(new Date()));
  const today = useMemo(() => new Date(), []);
  const todayWeekStart = useMemo(() => weekStartLocal(today), [today]);

  const days = useMemo(
    () => shiftsByDayInWeek(state, anchor),
    [state, anchor],
  );
  const totalShiftsThisWeek = useMemo(
    () => days.reduce((sum, d) => sum + d.shifts.length, 0),
    [days],
  );

  const isCurrentWeek = isSameLocalDay(anchor, todayWeekStart);

  const shiftWeek = (deltaDays: number) => {
    setAnchor((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + deltaDays);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team schedule</h1>
        <div className="text-sm text-slate-500">
          {totalShiftsThisWeek === 0
            ? 'No shifts scheduled this week'
            : `${totalShiftsThisWeek} shift${totalShiftsThisWeek === 1 ? '' : 's'} this week`}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftWeek(-7)}
          aria-label="Previous week"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <span aria-hidden>←</span>
        </button>
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold text-slate-900">
            {formatRangeLabel(anchor)}
          </div>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => setAnchor(todayWeekStart)}
              className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Jump to this week
            </button>
          )}
          {isCurrentWeek && (
            <div className="text-xs font-medium text-slate-400">This week</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => shiftWeek(7)}
          aria-label="Next week"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <span aria-hidden>→</span>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const dayDate = new Date(`${day.date}T00:00:00`);
          const isToday = isSameLocalDay(dayDate, today);
          return (
            <section key={day.date} aria-labelledby={`day-${day.date}`}>
              <div
                id={`day-${day.date}`}
                className="mb-2 flex items-baseline justify-between"
              >
                <div
                  className={`text-sm font-semibold tracking-wide uppercase ${
                    isToday ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                >
                  {formatLongDate(dayDate)}
                  {isToday && <span className="ml-2 text-xs">· Today</span>}
                </div>
                <div className="text-xs text-slate-400">
                  {day.shifts.length === 0
                    ? 'No shifts'
                    : `${day.shifts.length} shift${day.shifts.length === 1 ? '' : 's'}`}
                </div>
              </div>
              {day.shifts.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-400 ring-1 ring-slate-200">
                  —
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {day.shifts.map((shift) => {
                    const assignee = state.users[shift.assignedUserId];
                    const claimer = shift.claimedByUserId
                      ? state.users[shift.claimedByUserId]
                      : undefined;
                    return (
                      <ShiftRow
                        key={shift.id}
                        shift={shift}
                        assigneeName={assignee?.name ?? 'Unknown'}
                        claimerName={claimer?.name}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
