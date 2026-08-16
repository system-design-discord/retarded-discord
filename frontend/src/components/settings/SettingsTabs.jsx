import { NavLink } from 'react-router-dom';

// U-13 — the settings screens' second navigation, as a horizontal strip.
//
// All three of them inlined *two* fixed 256px rails: the main navigation, plus
// this one linking the settings screens to each other. That is 512px of chrome
// before any content, inside a 390px viewport — the single worst responsive
// break in the SPA and the reason these screens could not be demonstrated on a
// phone at all.
//
// The first rail is `NavSidebar`, which already collapses to icons. This one has
// no icons to collapse to and only ever pointed at four destinations, so it
// becomes a strip above the content instead of a column beside it. It scrolls
// horizontally rather than wrapping, so the row keeps one predictable height.
//
// Written once and imported three times, for the same reason `NavSidebar` is:
// three copies is how the rails drifted in the first place.

// Three, not four. The Privacy tab pointed at a screen whose every control was
// invented (#99); `/settings/privacy` redirects to Group Invitations now, which
// is where the one real privacy setting has lived since the wireframe promoted
// it out of Privacy into its own page.
const TABS = [
  { to: '/settings/account', label: 'My Account' },
  { to: '/profile/edit', label: 'Profile' },
  { to: '/settings/invitations', label: 'Group Invitations' },
];

export default function SettingsTabs() {
  return (
    <nav
      aria-label="Settings"
      className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-800 pb-3"
    >
      {TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition cursor-pointer ${
              isActive
                ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
