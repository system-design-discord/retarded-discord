// One formatting rule for the whole app. `created_at` is an ISO string from
// DRF; a message from today shows a clock time and anything older shows the
// date too, because "10:04" on a message from last week is a lie of omission.

function format(value) {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';

  const today = new Date();
  const sameDay =
    at.getFullYear() === today.getFullYear() &&
    at.getMonth() === today.getMonth() &&
    at.getDate() === today.getDate();

  return sameDay
    ? at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : at.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Timestamp({ value, className = '' }) {
  if (!value) return null;

  return (
    <time dateTime={value} className={`text-[11px] text-slate-500 ${className}`}>
      {format(value)}
    </time>
  );
}
