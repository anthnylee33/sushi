import { AppFrame } from './components/AppFrame';
import { BottomNav } from './components/BottomNav';
import { ToastHost } from './components/ToastHost';
import { TopBar } from './components/TopBar';
import { SessionProvider, useSession } from './state/SessionContext';
import { ShiftsProvider } from './state/ShiftsContext';
import { ToastProvider } from './state/ToastContext';
import { BoardView } from './views/BoardView';
import { ManagerQueueView } from './views/ManagerQueueView';
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
  return (
    <main className="flex-1 overflow-y-auto">
      <ManagerQueueView />
    </main>
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
