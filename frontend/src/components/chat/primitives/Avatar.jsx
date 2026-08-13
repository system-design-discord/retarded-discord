// The initial-circle avatar every conversation surface uses. Sized by prop
// rather than by the caller's own class string, so a bubble avatar and a
// sidebar avatar cannot drift apart.

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-10 h-10 text-base',
};

export default function Avatar({ name, size = 'md', className = '' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${SIZES[size] ?? SIZES.md} shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 ${className}`}
      title={name}
    >
      {initial}
    </div>
  );
}
