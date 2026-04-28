import { AppFrame } from './components/AppFrame';
import { BottomNav } from './components/BottomNav';
import { ToastHost } from './components/ToastHost';
import { TopBar } from './components/TopBar';
import { SessionProvider, useSession } from './state/SessionContext';
import { ShiftsProvider } from './state/ShiftsContext';
import { ToastProvider } from './state/ToastContext';
import { BoardView } from './views/BoardView';
import { ManagerQueueView } from './views/ManagerQueueView';
import { ManagerScheduleView } from './views/ManagerScheduleView';
import { MyScheduleView } from './views/MyScheduleView';
import { TimeOffView } from './views/TimeOffView';

function StaffArea() {
  const { staffTab } = useSession();
  return (
    <>
      <main className="flex-1 overflow-y-auto">
        {staffTab === 'schedule' && <MyScheduleView />}
        {staffTab === 'board' && <BoardView />}
        {staffTab === 'timeoff' && <TimeOffView />}
      </main>
      <BottomNav />
    </>
  );
}

function ManagerArea() {
  const { managerTab, setManagerTab } = useSession();
  return (
    <>
      <div
        role="tablist"
        aria-label="Manager view"
        className="border-b border-slate-200 bg-white px-4 pt-3 pb-2"
      >
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            role="tab"
            aria-selected={managerTab === 'schedule'}
            onClick={() => setManagerTab('schedule')}
            className={`h-9 rounded-lg transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
              managerTab === 'schedule'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Schedule
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={managerTab === 'approvals'}
            onClick={() => setManagerTab('approvals')}
            className={`h-9 rounded-lg transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
              managerTab === 'approvals'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approvals
          </button>
        </div>
      </div>
      <main className="flex-1 overflow-y-auto">
        {managerTab === 'schedule' ? (
          <ManagerScheduleView />
        ) : (
          <ManagerQueueView />
        )}
      </main>
    </>
  );
}

function Shell() {
  const { viewMode } = useSession();
  return (
    <AppFrame>
      <ToastHost />
      <TopBar />
      {viewMode === 'staff' ? <StaffArea /> : <ManagerArea />}
    </AppFrame>
  );
}

export default function App() {
  return (
    <ShiftsProvider>
      <SessionProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </SessionProvider>
    </ShiftsProvider>
  );
}
