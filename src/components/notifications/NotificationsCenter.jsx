import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Group Invitation', body: 'Arman invited you to "CE-40418 Backend API".', type: 'invite', isRead: false },
  { id: 2, title: 'Mention in #general', body: 'Arvin mentioned you: "@Amir please check Sprint 2 deliverables."', type: 'mention', isRead: false },
  { id: 3, title: 'Role Changed', body: 'You were promoted to Admin in #frontend-help channel.', type: 'role', isRead: true }
];

const NotificationsCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleInviteAction = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🏠</span> Home
        </button>
        <button onClick={() => navigate('/dms')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>💬</span> Direct Messages
        </button>
        <button onClick={() => navigate('/groups')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👥</span> Groups
        </button>
        <button onClick={() => navigate('/channels')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>📢</span> Channels
        </button>
        <button onClick={() => navigate('/search')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔍</span> Search
        </button>
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </button>
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Notifications</h1>
              <p className="text-slate-400 text-sm mt-1">Activity across your direct messages, groups, and channels.</p>
            </div>
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Mark All Read
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {['All', 'Mentions', 'Invites'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition flex items-start gap-4 ${
                    notif.isRead ? 'bg-slate-900/50 border-slate-800/60' : 'bg-slate-900 border-indigo-500/30'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${notif.isRead ? 'bg-slate-700' : 'bg-indigo-500'}`}></span>
                  <div className="flex-1">
                    <strong className="text-sm text-white">{notif.title}</strong>
                    <p className="text-xs text-slate-400 mt-1">{notif.body}</p>
                    
                    {notif.type === 'invite' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleInviteAction(notif.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition">Accept</button>
                        <button onClick={() => handleInviteAction(notif.id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition">Decline</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 text-sm py-12">No notifications to display.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsCenter;