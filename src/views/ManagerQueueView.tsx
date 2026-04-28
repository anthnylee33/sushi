import { useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { CreateShiftForm } from '../components/CreateShiftForm';
import { ShiftCard } from '../components/ShiftCard';
import { TimeOffCard } from '../components/TimeOffCard';
import { useShifts } from '../state/ShiftsContext';
import { useToast } from '../state/ToastContext';
import {
  assignedShiftsInRange,
  pendingApprovalQueue,
  pendingTimeOffQueue,
  weeklyHoursFor,
  wouldExceedOvertime,
} from '../state/selectors';

export function ManagerQueueView() {
  const { state, tryDispatch } = useShifts();
  const { showToast } = useToast();
  const swapQueue = pendingApprovalQueue(state);
  const timeOffQueue = pendingTimeOffQueue(state);
  const totalPending = swapQueue.length + timeOffQueue.length;

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Approval queue
          </h1>
          <div className="text-sm text-slate-500">
            {totalPending === 0
              ? 'Nothing waiting on you'
              : `${totalPending} request${totalPending === 1 ? '' : 's'} waiting on you`}
          </div>
        </div>
        {!createOpen && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
            aria-label="Add a new shift"
          >
            + Add shift
          </button>
        )}
      </div>

      {createOpen && (
        <CreateShiftForm onClose={() => setCreateOpen(false)} />
      )}

      {totalPending === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-200">
          <div className="text-3xl" aria-hidden>
            ✨
          </div>
          <div className="mt-2 font-semibold text-slate-700">
            All caught up
          </div>
          <div className="mt-1 text-sm">
            No swap or time-off requests right now.
          </div>
        </div>
      ) : (
        <>
          <section aria-labelledby="swap-section">
            <div
              id="swap-section"
              className="mb-2 flex items-center justify-between"
            >
              <div className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Swap requests
              </div>
              <div className="text-xs text-slate-400">
                {swapQueue.length}
              </div>
            </div>
            {swapQueue.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                No pending swaps.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {swapQueue.map((shift) => {
                  const offering = state.users[shift.assignedUserId];
                  const claiming = shift.claimedByUserId
                    ? state.users[shift.claimedByUserId]
                    : undefined;
                  const overtime =
                    !!claiming && wouldExceedOvertime(state, claiming.id, shift);
                  const claimerHours = claiming
                    ? weeklyHoursFor(
                        state,
                        claiming.id,
                        new Date(shift.startTime),
                      )
                    : 0;

                  return (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      topRight={
                        overtime ? <Badge tone="red">Overtime</Badge> : undefined
                      }
                    >
                      <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">From</span>
                          <span className="font-semibold text-slate-900">
                            {offering?.name ?? 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">To</span>
                          <span className="font-semibold text-slate-900">
                            {claiming?.name ?? 'Unknown'}
                          </span>
                        </div>
                        {claiming && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">
                              {claiming.name.split(' ')[0]}'s hrs that week
                            </span>
                            <span
                              className={`font-semibold ${
                                overtime ? 'text-red-600' : 'text-slate-900'
                              }`}
                            >
                              {claimerHours.toFixed(1)} hrs
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const ok = tryDispatch({ type: 'DENY', shiftId: shift.id });
                            if (ok) showToast('Swap denied — back on the Board');
                          }}
                        >
                          Deny
                        </Button>
                        <Button
                          variant="success"
                          onClick={() => {
                            const ok = tryDispatch({ type: 'APPROVE', shiftId: shift.id });
                            if (ok) showToast('Swap approved', 'success');
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </ShiftCard>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="time-off-section">
            <div
              id="time-off-section"
              className="mb-2 flex items-center justify-between"
            >
              <div className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Time off requests
              </div>
              <div className="text-xs text-slate-400">
                {timeOffQueue.length}
              </div>
            </div>
            {timeOffQueue.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                No pending time-off requests.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {timeOffQueue.map((req) => {
                  const requester = state.users[req.userId];
                  const shiftsInRange = assignedShiftsInRange(
                    state,
                    req.userId,
                    req.startDate,
                    req.endDate,
                  );
                  const coverageWarning = shiftsInRange.length > 0;
                  return (
                    <TimeOffCard
                      key={req.id}
                      request={req}
                      requesterName={requester?.name ?? 'Unknown'}
                      topRight={
                        coverageWarning ? (
                          <Badge tone="red">
                            {shiftsInRange.length} shift
                            {shiftsInRange.length === 1 ? '' : 's'}
                          </Badge>
                        ) : undefined
                      }
                    >
                      {coverageWarning && (
                        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                          {requester?.name.split(' ')[0] ?? 'They'} still
                          {' '}covers {shiftsInRange.length} shift
                          {shiftsInRange.length === 1 ? '' : 's'} in this range.
                          They'll need coverage first.
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const ok = tryDispatch({
                              type: 'TIME_OFF_DENY',
                              requestId: req.id,
                            });
                            if (ok) showToast('Time-off request denied');
                          }}
                        >
                          Deny
                        </Button>
                        <Button
                          variant="success"
                          onClick={() => {
                            const ok = tryDispatch({
                              type: 'TIME_OFF_APPROVE',
                              requestId: req.id,
                            });
                            if (ok) showToast('Time-off request approved', 'success');
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </TimeOffCard>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
