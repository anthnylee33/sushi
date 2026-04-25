import { Button } from '../components/Button';
import { ShiftCard } from '../components/ShiftCard';
import { useSession } from '../state/SessionContext';
import { useShifts } from '../state/ShiftsContext';
import { useToast } from '../state/ToastContext';
import {
  myScheduleForUser,
  nextShiftForUser,
  weeklyHoursFor,
} from '../state/selectors';

export function MyScheduleView() {
  const { state, tryDispatch } = useShifts();
  const { currentUserId } = useSession();
  const me = state.users[currentUserId];

  const next = nextShiftForUser(state, currentUserId);
  const upcoming = myScheduleForUser(state, currentUserId);
  const rest = next ? upcoming.filter((s) => s.id !== next.id) : upcoming;
  const hours = weeklyHoursFor(state, currentUserId);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hi, {me?.name.split(' ')[0]}
        </h1>
        <div className="text-sm text-slate-500">
          {hours.toFixed(1)} hrs scheduled this week
        </div>
      </div>

      {next ? (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Next up
          </div>
          <ShiftCard shift={next} highlight>
            <ActionFor shiftId={next.id} tryDispatch={tryDispatch} status={next.status} />
          </ShiftCard>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">
          No upcoming shifts.
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Upcoming
          </div>
          <div className="flex flex-col gap-3">
            {rest.map((s) => (
              <ShiftCard key={s.id} shift={s}>
                <ActionFor shiftId={s.id} tryDispatch={tryDispatch} status={s.status} />
              </ShiftCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionFor({
  shiftId,
  status,
  tryDispatch,
}: {
  shiftId: string;
  status: 'Active' | 'Offered' | 'PendingApproval';
  tryDispatch: ReturnType<typeof useShifts>['tryDispatch'];
}) {
  const { currentUserId } = useSession();
  const { showToast } = useToast();
  if (status === 'Active') {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          const ok = tryDispatch({ type: 'NEED_COVERAGE', shiftId, actorId: currentUserId });
          if (ok) showToast('Shift posted to the Board', 'success');
        }}
      >
        Need coverage
      </Button>
    );
  }
  if (status === 'Offered') {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          const ok = tryDispatch({ type: 'WITHDRAW', shiftId, actorId: currentUserId });
          if (ok) showToast('Shift pulled from the Board');
        }}
      >
        Withdraw from board
      </Button>
    );
  }
  // PendingApproval — no action, badge already shown.
  return (
    <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
      Waiting on manager approval
    </div>
  );
}
