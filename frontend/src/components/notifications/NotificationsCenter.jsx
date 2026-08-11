import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const NotificationsCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications from the backend on load
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('notifications/');
        setNotifications(response.data);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Smart click handler: Marks as read via API, then navigates based on the event type
  const handleNotificationClick = async (notif) => {
    // If it's unread, tell the backend we are reading it now
    if (!notif.isRead && !notif.is_read) {
      try {
        await api.post(`notifications/${notif.id}/read/`);
        // Update local state instantly so the unread badge disappears
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true, is_read: true } : n));
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }

    // Route based on the three event types required by the AC
    const type = notif.type?.toLowerCase() || '';
    if (type.includes('message')) {
      navigate('/dms');
    } else if (type.includes('group') || type.includes('invite') || type.includes('channel')) {
      navigate('/groups');
    } else if (type.includes('role')) {
      navigate('/profile');
    } else if (notif.link) {
      navigate(notif.link); // Fallback if the backend provides a direct link
    }
  };

  // Keep the dedicated invite action for inline accept/decline buttons
  const handleInviteAction = async (e, id, action) => {
    e.stopPropagation(); // Prevent the main notification click handler from firing
    try {
      await api.post(`groups/invites/${id}/${action}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(`Failed to ${action} invite:`, err);
    }
  };

  // Filter logic based on tabs
  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Messages') return notif.type?.includes('message');
    if (activeTab === 'Invites') return notif.type?.includes('invite') || notif.type?.includes('group');
    if (activeTab === 'System') return notif.type?.includes('role');
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation - Upgraded to Links with proper icons */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🏠</span> Home
        </Link>
        <Link to="/dms" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>💬</span> Direct Messages
        </Link>
        <Link to="/groups" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👥</span> Groups
        </Link>
        <Link to="/channels" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>📢</span> Channels
        </Link>
        <Link to="/search" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔍</span> Search
        </Link>
        <Link to="/notifications" className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </Link>
        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </Link>
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
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
            >
              Mark All Read
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {['All', 'Messages', 'Invites', 'System'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {isLoading ? (
               <div className="text-center text-slate-500 text-sm py-12">Loading notifications...</div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map(notif => {
                const isRead = notif.isRead || notif.is_read;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 rounded-2xl border transition flex items-start gap-4 cursor-pointer ${
                      isRead ? 'bg-slate-900/50 border-slate-800/60 hover:bg-slate-900' : 'bg-slate-900 border-indigo-500/30 hover:border-indigo-500/60 shadow-md'
                    }`}
                  >
                    {/* Unread Badge */}
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 transition-colors duration-300 ${isRead ? 'bg-slate-700' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'}`}></span>
                    <div className="flex-1">
                      <strong className="text-sm text-white">{notif.title}</strong>
                      <p className="text-xs text-slate-400 mt-1">{notif.body}</p>
                      
                      {/* Inline Invite Actions */}
                      {notif.type?.includes('invite') && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={(e) => handleInviteAction(e, notif.id, 'accept')} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition">Accept</button>
                          <button onClick={(e) => handleInviteAction(e, notif.id, 'decline')} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition border border-slate-700">Decline</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-500 text-sm py-12 border border-slate-800/50 rounded-2xl bg-slate-900/20">
                You're all caught up! No notifications to display.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsCenter;