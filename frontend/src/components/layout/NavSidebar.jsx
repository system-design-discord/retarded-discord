import { NavLink } from 'react-router-dom';

// The seven-link navigation, written once. It was copy-pasted verbatim into
// eight components, which is why two of them highlight the wrong entry and two
// use buttons and `navigate()` where the rest use links.
//
// Only the screens this card rewrote adopt it so far. The rest are in flight
// under U-13 and are left alone on purpose — see the note in the execution plan.

const LINKS = [
  { to: '/dashboard', icon: '🏠', label: 'Home' },
  { to: '/dms', icon: '💬', label: 'Direct Messages' },
  { to: '/groups', icon: '👥', label: 'Groups' },
  { to: '/channels', icon: '📢', label: 'Channels' },
  { to: '/search', icon: '🔍', label: 'Search' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

export default function NavSidebar({ active }) {
  return (
    <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
      <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
        Navigation
      </div>
      {LINKS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition cursor-pointer ${
              isActive || active === to
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`
          }
        >
          <span>{icon}</span> {label}
        </NavLink>
      ))}
    </aside>
  );
}
