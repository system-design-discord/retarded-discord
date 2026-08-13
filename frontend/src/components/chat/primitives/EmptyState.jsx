// The shared "nothing here yet" block. An empty conversation must say so —
// F-02's acceptance criterion is an empty state, not a spinner forever.

export default function EmptyState({ icon = '💬', title, hint }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 gap-2">
      <div className="text-3xl opacity-60">{icon}</div>
      <div className="text-sm font-semibold text-slate-400">{title}</div>
      {hint && <div className="text-xs text-slate-600 max-w-xs">{hint}</div>}
    </div>
  );
}
