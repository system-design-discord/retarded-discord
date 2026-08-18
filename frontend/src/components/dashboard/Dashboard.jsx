import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Import the AuthContext
import useRecentChats from '../../hooks/useRecentChats';
import { Avatar, EmptyState, Timestamp } from '../chat/primitives';
import usePresence from '../../hooks/usePresence';
import NavSidebar from '../layout/NavSidebar';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isOnline } = usePresence();

  // Grab the user from context to display their name
  const { user } = useContext(AuthContext);

  // U-02: these rows used to be a hardcoded array naming teammates who were
  // not in the database. They are derived from the message API now, by the
  // same helpers the direct-message sidebar uses.
  const { chats, loading, error } = useRecentChats(user?.id); 

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/dashboard" />

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Banner - Dynamically pulling the user's name */}
          <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 shadow-xl">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Welcome Back, {user?.name || user?.username || 'Guest'}!
            </h1>
            <p className="text-slate-400 text-sm">Jump right back into your conversations or start a new group chat.</p>
          </div>

          {/* Quick Actions. Real buttons, like every clickable row in the SPA — the
              recent-chat list below was the one that had drifted (#106). */}
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button type="button" onClick={() => navigate('/dms')} className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition duration-200 group cursor-pointer">
                <div aria-hidden="true" className="text-2xl mb-2 group-hover:scale-110 transition-transform">💬</div>
                <div className="font-bold text-slate-200">New Direct Message</div>
                <div className="text-xs text-slate-500">Chat 1-on-1 with teammates</div>
              </button>
              <button type="button" onClick={() => navigate('/groups')} className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition duration-200 group cursor-pointer">
                <div aria-hidden="true" className="text-2xl mb-2 group-hover:scale-110 transition-transform">👥</div>
                <div className="font-bold text-slate-200">Create Group</div>
                <div className="text-xs text-slate-500">Form a team chat room</div>
              </button>
              <button type="button" onClick={() => navigate('/channels')} className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition duration-200 group cursor-pointer">
                <div aria-hidden="true" className="text-2xl mb-2 group-hover:scale-110 transition-transform">📢</div>
                <div className="font-bold text-slate-200">Explore Channels</div>
                <div className="text-xs text-slate-500">Browse project channels</div>
              </button>
            </div>
          </div>

          {/* Recent Conversations */}
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Recent Conversations</h3>
            <div className="space-y-3">
              {loading && <div className="text-sm text-slate-500">Loading…</div>}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {!loading && !error && chats.length === 0 && (
                <EmptyState
                  title="No conversations yet"
                  hint="Start one from Direct Messages, or create a group."
                />
              )}

              {chats.map(chat => (
                <button
                  key={chat.key}
                  type="button"
                  onClick={() => navigate(chat.to)}
                  className="w-full text-left p-4 bg-slate-900 border border-slate-800/80 hover:bg-slate-800/60 rounded-xl flex justify-between items-center gap-4 transition cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    {/* A row is a person or a room, and both have a picture.
                        `useRecentChats` carries it on the merged row so this
                        does not have to know which kind it is drawing — except
                        for the dot, which only a person can have: `userId` is
                        null on a group row and `Avatar` draws no dot when
                        `online` is undefined. */}
                    <Avatar
                      name={chat.title}
                      src={chat.avatar}
                      alt={chat.userId ? undefined : chat.title}
                      online={chat.userId ? isOnline(chat.userId) : undefined}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">{chat.title}</div>
                      <div className="text-xs text-slate-400 mt-1 truncate">{chat.preview}</div>
                    </div>
                  </div>
                  <Timestamp value={chat.at} className="shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;