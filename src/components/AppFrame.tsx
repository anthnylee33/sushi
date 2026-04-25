import type { ReactNode } from 'react';

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full w-full bg-slate-100 sm:py-6">
      <div className="relative mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-[calc(100vh-3rem)] sm:rounded-3xl">
        {children}
      </div>
    </div>
  );
}
