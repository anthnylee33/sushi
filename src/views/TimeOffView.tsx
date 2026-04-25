export function TimeOffView() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
      <div>
        <div className="text-2xl font-bold text-slate-900">Time Off</div>
        <div className="text-sm text-slate-500">Request days away from work</div>
      </div>
      <div className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-200">
        <div className="text-3xl">🌴</div>
        <div className="mt-2 font-semibold text-slate-700">Coming soon</div>
        <div className="mt-1 text-sm">
          Time-off requests aren't part of this MVP.
        </div>
      </div>
    </div>
  );
}
