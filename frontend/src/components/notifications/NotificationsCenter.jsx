import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavSidebar from '../layout/NavSidebar';
import { Timestamp } from '../chat/primitives';
import useNotifications from '../../hooks/useNotifications';

// US-11.1, and since F-08 the live half of US-B1.2.
//
// `N-02` wired this screen to the API and `U-11` gave it its tabs. What F-08
// changed is only the delivery path: notifications now arrive over the socket
// `RT-03` pushes them down, and the behaviour on top of them — mark read, then
// go where the notification points — is deliberately untouched. That is the
// card's third criterion, and the way to keep it true was to move the state out
// of this file rather than to add a socket beside it.
//
// Everything now comes from `useNotifications`, which reads the one list the
// whole SPA shares. The badge in the rail beside this screen is counted from
// the same array, so the two cannot disagree.

// The three kinds are `Notification.Kind` on the backend, and there are exactly
// three because US-11.1 names exactly three.
const TABS = {
  All: () => true,
  Messages: (notification) => notification.type === 'message',
  Invites: (notification) => notification.type === 'member_added',
  System: (notification) => notification.type === 'role_changed',
};

export default function NotificationsCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');

  const { notifications, unread, loading, live, error, setError, markRead, markAllRead } =
    useNotifications();

  // Mark read, then go where the notification points. The backend stores that
  // path on the row itself, so the three kinds do not need three branches here.
  const open = async (notification) => {
    if (!notification.is_read) await markRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const visible = notifications.filter(TABS[activeTab] ?? (() => true));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/notifications" />

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-white">Notifications</h1>
              <p className="text-slate-400 text-sm mt-1">
                Activity across your direct messages, groups, and channels.
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
            >
              Mark All Read
            </button>
          </div>

          {/* The same distinction the chat header draws, for the same reason:
              connected, a notification appears the instant it is generated;
              not connected, it appears on the next visit to this screen. */}
          <span
            className="flex items-center gap-1.5 text-[11px] text-slate-500"
            title={
              live
                ? 'Connected — notifications arrive as they happen.'
                : 'Not connected — this list was loaded when the screen opened.'
            }
          >
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
            {live ? 'Live' : 'Not connected'}
            {unread > 0 && <span className="ml-2">· {unread} unread</span>}
          </span>

          <div className="flex gap-2 flex-wrap">
            {Object.keys(TABS).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200 whitespace-pre-line">
              {error}
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-3 text-xs underline cursor-pointer"
              >
                dismiss
              </button>
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-slate-500 text-sm py-12">
                Loading notifications...
              </div>
            ) : visible.length > 0 ? (
              visible.map((notification) => {
                const isRead = notification.is_read;

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => open(notification)}
                    className={`w-full text-left p-4 rounded-2xl border transition flex items-start gap-4 cursor-pointer ${
                      isRead
                        ? 'bg-slate-900/50 border-slate-800/60 hover:bg-slate-900'
                        : 'bg-slate-900 border-indigo-500/30 hover:border-indigo-500/60 shadow-md'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 transition-colors duration-300 ${
                        isRead
                          ? 'bg-slate-700'
                          : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <strong className="text-sm text-white break-words">{notification.title}</strong>
                      <p className="text-xs text-slate-400 mt-1 break-words">{notification.body}</p>
                      <Timestamp
                        value={notification.created_at}
                        className="text-[11px] text-slate-600 mt-2 block"
                      />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center text-slate-500 text-sm py-12 border border-slate-800/50 rounded-2xl bg-slate-900/20">
                You&apos;re all caught up! No notifications to display.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
