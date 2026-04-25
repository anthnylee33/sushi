import { Button } from '../components/Button';
import { ShiftCard } from '../components/ShiftCard';
import { useSession } from '../state/SessionContext';
import { useShifts } from '../state/ShiftsContext';
import { boardForUser } from '../state/selectors';

export function BoardView() {
  const { state, dispatch } = useShifts();
  const { currentUserId } = useSession();
  const me = state.users[currentUserId];

  const offers = boardForUser(state, currentUserId);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div>
        <div className="text-2xl font-bold text-slate-900">The Board</div>
        <div className="text-sm text-slate-500">
          Open {me?.role.toLowerCase()} shifts you can pick up
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">
          Nothing available right now. Check back later.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map((shift) => {
            const offeredBy = state.users[shift.assignedUserId];
            return (
              <ShiftCard key={shift.id} shift={shift}>
                <div className="mb-3 text-sm text-slate-600">
                  Offered by{' '}
                  <span className="font-semibold text-slate-900">
                    {offeredBy?.name ?? 'Unknown'}
                  </span>
                </div>
                <Button
                  onClick={() =>
                    dispatch({
                      type: 'CLAIM',
                      shiftId: shift.id,
                      actorId: currentUserId,
                    })
                  }
                >
                  Claim shift
                </Button>
              </ShiftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
