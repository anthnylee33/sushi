import { useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TimeOffCard } from '../components/TimeOffCard';
import { useSession } from '../state/SessionContext';
import { useShifts } from '../state/ShiftsContext';
import { timeOffForUser } from '../state/selectors';

function todayYmd(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Local YYYY-MM-DD so the min= attribute matches what <input type="date">
  // emits in the user's timezone.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId(): string {
  return `to-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TimeOffView() {
  const { state, dispatch } = useShifts();
  const { currentUserId } = useSession();
  const requests = timeOffForUser(state, currentUserId);

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => todayYmd(), []);

  const reset = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = () => {
    if (!startDate || !endDate) {
      setError('Pick a start and end date.');
      return;
    }
    if (startDate > endDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    if (reason.trim().length === 0) {
      setError('Tell your manager why you need the time.');
      return;
    }
    dispatch({
      type: 'TIME_OFF_REQUEST',
      requestId: generateId(),
      actorId: currentUserId,
      startDate,
      endDate,
      reason,
    });
    close();
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-slate-900">Time Off</div>
          <div className="text-sm text-slate-500">
            {requests.length === 0
              ? 'No requests yet'
              : `${requests.length} request${requests.length === 1 ? '' : 's'}`}
          </div>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
            aria-label="Request time off"
          >
            + Request
          </button>
        )}
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <div className="text-base font-semibold text-slate-900">
            New request
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Start date</span>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 px-3 text-base text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">End date</span>
            <input
              type="date"
              value={endDate}
              min={startDate || today}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 px-3 text-base text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family visit, doctor appointment…"
              rows={3}
              className="resize-none rounded-xl bg-slate-50 px-3 py-2 text-base text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </label>
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200"
            >
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit
            </Button>
          </div>
        </form>
      )}

      {requests.length === 0 && !open ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-200">
          <div className="text-3xl" aria-hidden>
            🌴
          </div>
          <div className="mt-2 font-semibold text-slate-700">
            No requests yet
          </div>
          <div className="mt-1 text-sm">
            Tap Request to ask for days away from work.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <TimeOffCard
              key={r.id}
              request={r}
              topRight={
                r.status === 'Pending' ? (
                  <Badge tone="amber">Waiting on manager</Badge>
                ) : undefined
              }
            >
              {r.status === 'Pending' && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    dispatch({
                      type: 'TIME_OFF_CANCEL',
                      requestId: r.id,
                      actorId: currentUserId,
                    })
                  }
                >
                  Withdraw request
                </Button>
              )}
            </TimeOffCard>
          ))}
        </div>
      )}
    </div>
  );
}
