import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ShiftCard } from '../components/ShiftCard';
import { useShifts } from '../state/ShiftsContext';
import {
  pendingApprovalQueue,
  weeklyHoursFor,
  wouldExceedOvertime,
} from '../state/selectors';

export function ManagerQueueView() {
  const { state, dispatch } = useShifts();
  const queue = pendingApprovalQueue(state);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <div>
        <div className="text-2xl font-bold text-slate-900">
          Approval queue
        </div>
        <div className="text-sm text-slate-500">
          {queue.length} swap{queue.length === 1 ? '' : 's'} waiting on you
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-200">
          <div className="text-3xl">✨</div>
          <div className="mt-2 font-semibold text-slate-700">All caught up</div>
          <div className="mt-1 text-sm">No pending swap requests.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((shift) => {
            const offering = state.users[shift.assignedUserId];
            const claiming = shift.claimedByUserId
              ? state.users[shift.claimedByUserId]
              : undefined;
            const overtime =
              !!claiming &&
              wouldExceedOvertime(state, claiming.id, shift);
            const claimerHours = claiming
              ? weeklyHoursFor(state, claiming.id)
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
                        {claiming.name.split(' ')[0]}'s week so far
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
                    onClick={() =>
                      dispatch({ type: 'DENY', shiftId: shift.id })
                    }
                  >
                    Deny
                  </Button>
                  <Button
                    variant="success"
                    onClick={() =>
                      dispatch({ type: 'APPROVE', shiftId: shift.id })
                    }
                  >
                    Approve
                  </Button>
                </div>
              </ShiftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
