import { AppFrame } from './components/AppFrame';
import { BottomNav } from './components/BottomNav';
import { TopBar } from './components/TopBar';
import { SessionProvider, useSession } from './state/SessionContext';
import { ShiftsProvider } from './state/ShiftsContext';
import { BoardView } from './views/BoardView';
import { ManagerQueueView } from './views/ManagerQueueView';
import { MyScheduleView } from './views/MyScheduleView';
import { TimeOffView } from './views/TimeOffView';

function StaffArea() {
  const { staffTab } = useSession();
  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {staffTab === 'schedule' && <MyScheduleView />}
        {staffTab === 'board' && <BoardView />}
        {staffTab === 'timeoff' && <TimeOffView />}
      </div>
      <BottomNav />
    </>
  );
}

function ManagerArea() {
  return (
    <div className="flex-1 overflow-y-auto">
      <ManagerQueueView />
    </div>
  );
}

function Shell() {
  const { viewMode } = useSession();
  return (
    <AppFrame>
      <TopBar />
      {viewMode === 'staff' ? <StaffArea /> : <ManagerArea />}
    </AppFrame>
  );
}

export default function App() {
  return (
    <ShiftsProvider>
      <SessionProvider>
        <Shell />
      </SessionProvider>
    </ShiftsProvider>
  );
}
