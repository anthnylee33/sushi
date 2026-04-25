import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ViewMode = 'staff' | 'manager';
export type StaffTab = 'schedule' | 'board' | 'timeoff';

interface SessionContextValue {
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  staffTab: StaffTab;
  setStaffTab: (t: StaffTab) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>('u-maya');
  const [viewMode, setViewMode] = useState<ViewMode>('staff');
  const [staffTab, setStaffTab] = useState<StaffTab>('schedule');

  const value = useMemo(
    () => ({
      currentUserId,
      setCurrentUserId,
      viewMode,
      setViewMode,
      staffTab,
      setStaffTab,
    }),
    [currentUserId, viewMode, staffTab],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
