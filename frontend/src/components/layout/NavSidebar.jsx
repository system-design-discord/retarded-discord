import { NavLink, useLocation } from 'react-router-dom';
import useNotifications from '../../hooks/useNotifications';

// The navigation, written once. It was copy-pasted verbatim into eight
// components, which is why two of them highlighted the wrong entry and two used
// buttons and `navigate()` where the rest used links.
//
// **U-13 finished the adoption**: every screen in the SPA renders this rail now,
// and there are no inlined copies left. Three of the settings screens carried
// *two* fixed 256px rails, which is 512px of chrome inside a 390px viewport;
// their second rail became a horizontal tab strip instead.
//
// The **Settings** entry is U-13's addition and not cosmetic. `/settings/*` was
// reachable from nowhere in the SPA, and since `G-04` put the only logout button
// on the account screen, neither was logging out.

const LINKS = [
  { to: '/dashboard', icon: '🏠', label: 'Home' },
  { to: '/dms', icon: '💬', label: 'Direct Messages' },
  { to: '/groups', icon: '👥', label: 'Groups' },
  { to: '/channels', icon: '📢', label: 'Channels' },
  { to: '/search', icon: '🔍', label: 'Search' },
  { to: '/notifications', icon: '🔔', label: 'Notifications', badge: 'unread' },
  { to: '/profile', icon: '👤', label: 'Profile' },
  { to: '/settings/account', icon: '⚙️', label: 'Settings' },
];

/** Two digits and then some. A rail 64px wide at 390px cannot show "127". */
function badgeLabel(count) {
  return count > 99 ? '99+' : String(count);
}

// Below `md` the rail collapses to icons: two fixed sidebars plus a chat pane
// do not fit in 390px, and no screen may break there.
export default function NavSidebar({ active }) {
  // F-08 — the badge is the unread count from the one list the whole SPA
  // shares, so it cannot disagree with the centre it links to. Below `md` the
  // labels are gone and the count rides on the icon instead, because an unread
  // count nobody can see on a phone is not a notification surface.
  const { unread } = useNotifications();

  // One entry stands for three routes, so `NavLink`'s own exact match would
  // leave Settings unhighlighted on two of the three screens it reaches.
  const inSettings = useLocation().pathname.startsWith('/settings');

  return (
    <aside className="w-16 md:w-64 shrink-0 bg-slate-900 border-r border-slate-800 p-2 md:p-4 flex flex-col gap-2">
      <div className="hidden md:block px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
        Navigation
      </div>
      {LINKS.map(({ to, icon, label, badge }) => {
        const count = badge === 'unread' ? unread : 0;

        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center justify-center md:justify-start gap-3 px-2 md:px-4 py-2.5 rounded-xl font-medium transition cursor-pointer ${
                isActive || active === to || (to.startsWith('/settings') && inSettings)
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <span title={count > 0 ? `${label} — ${count} unread` : label}>{icon}</span>
            <span className="hidden md:inline">{label}</span>
            {count > 0 && (
              <span
                aria-label={`${count} unread`}
                className="absolute md:static top-1 right-1 md:ml-auto min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold shrink-0"
              >
                {badgeLabel(count)}
              </span>
            )}
          </NavLink>
        );
      })}
    </aside>
  );
}
