import { useSession, type StaffTab } from '../state/SessionContext';

const tabs: { id: StaffTab; label: string; icon: string }[] = [
  { id: 'schedule', label: 'My Schedule', icon: '📅' },
  { id: 'board', label: 'The Board', icon: '🔄' },
  { id: 'timeoff', label: 'Time Off', icon: '🌴' },
];

export function BottomNav() {
  const { staffTab, setStaffTab } = useSession();

  return (
    <nav
      className="absolute right-0 bottom-0 left-0 grid grid-cols-3 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label="Primary"
    >
      {tabs.map((t) => {
        const active = staffTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setStaffTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition ${
              active ? 'text-indigo-600' : 'text-slate-500'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <span aria-hidden className="text-xl leading-none">
              {t.icon}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
