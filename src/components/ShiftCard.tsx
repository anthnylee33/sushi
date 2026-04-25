import type { ReactNode } from 'react';
import type { Shift, ShiftStatus } from '../types';
import { Badge } from './Badge';
import { shiftHours } from '../state/selectors';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ShiftCard({
  shift,
  highlight = false,
  topRight,
  footer,
  children,
}: {
  shift: Shift;
  highlight?: boolean;
  topRight?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg'
          : 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={`text-xs font-semibold uppercase tracking-wide ${
              highlight ? 'text-indigo-100' : 'text-slate-500'
            }`}
          >
            {shift.role}
          </div>
          <div
            className={`mt-1 text-lg font-semibold ${
              highlight ? 'text-white' : 'text-slate-900'
            }`}
          >
            {formatDate(shift.startTime)}
          </div>
          <div
            className={`mt-0.5 text-base ${
              highlight ? 'text-indigo-50' : 'text-slate-600'
            }`}
          >
            {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
            <span
              className={`ml-2 ${
                highlight ? 'text-indigo-100' : 'text-slate-400'
              }`}
            >
              · {shiftHours(shift)}h
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {topRight}
          {!highlight && (
            <Badge tone={statusToTone[shift.status]}>
              {statusToLabel[shift.status]}
            </Badge>
          )}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
