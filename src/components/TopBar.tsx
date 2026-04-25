import { useShifts } from '../state/ShiftsContext';
import { useSession } from '../state/SessionContext';

export function TopBar() {
  const { state } = useShifts();
  const {
    currentUserId,
    setCurrentUserId,
    viewMode,
    setViewMode,
  } = useSession();

  const users = Object.values(state.users);

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 pt-4 pb-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label
            htmlFor="acting-as"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Acting as
          </label>
          <select
            id="acting-as"
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-base font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded"
            disabled={viewMode === 'manager'}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.role}
              </option>
            ))}
          </select>
        </div>
        <div
          className="inline-flex shrink-0 rounded-full bg-slate-100 p-1 text-sm font-semibold ring-1 ring-slate-200"
          role="tablist"
          aria-label="View mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'staff'}
            onClick={() => setViewMode('staff')}
            className={`rounded-full px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              viewMode === 'staff'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Staff
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'manager'}
            onClick={() => setViewMode('manager')}
            className={`rounded-full px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              viewMode === 'manager'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Manager
          </button>
        </div>
      </div>
    </div>
  );
}
