import type { ReactNode } from 'react';
import type { TimeOffRequest, TimeOffStatus } from '../types';
import { Badge } from './Badge';

const statusToTone: Record<TimeOffStatus, 'amber' | 'green' | 'red'> = {
  Pending: 'amber',
  Approved: 'green',
  Denied: 'red',
};

const statusToLabel: Record<TimeOffStatus, string> = {
  Pending: 'Waiting',
  Approved: 'Approved',
  Denied: 'Denied',
};

function formatDate(ymd: string): string {
  // Local-midnight to avoid TZ drift rendering a YYYY-MM-DD string.
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function TimeOffCard({
  request,
  requesterName,
  topRight,
  children,
}: {
  request: TimeOffRequest;
  requesterName?: string;
  topRight?: ReactNode;
  children?: ReactNode;
}) {
  const sameDay = request.startDate === request.endDate;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {requesterName && (
            <div className="truncate text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {requesterName}
            </div>
          )}
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {sameDay
              ? formatDate(request.startDate)
              : `${formatDate(request.startDate)} – ${formatDate(
                  request.endDate,
                )}`}
          </div>
          <div className="mt-0.5 text-sm text-slate-600">{request.reason}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {topRight}
          <Badge tone={statusToTone[request.status]}>
            {statusToLabel[request.status]}
          </Badge>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
