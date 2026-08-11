import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Import the AuthContext

const RECENT_CHATS = [
  { id: 1, type: 'dms', title: 'Arman (Backend Lead)', lastMessage: 'API endpoints are ready for integration.', time: '10:45 AM' },
  { id: 2, type: 'channels', title: '# general-discussion', lastMessage: 'Arvin: Sprint 2 review is scheduled for tomorrow.', time: '11:20 AM' },
  { id: 3, type: 'groups', title: 'CE-40418 Discord Team', lastMessage: 'Majid: Database fixtures updated.', time: 'Yesterday' }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [recentChats] = useState(RECENT_CHATS);
  
  // Grab the user from context to display their name
  const { user } = useContext(AuthContext); 

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation - Upgraded to React Router Links */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition">
          <span>🏠</span> Home
        </Link>
        <Link to="/dms" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition">
          <span>💬</span> Direct Messages
        </Link>
        <Link to="/groups" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition">
          <span>👥</span> Groups
        </Link>
        <Link to="/channels" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition">
          <span>📢</span> Channels
        </Link>
        <Link to="/search" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition">
          <span>🔍</span> Search
        </Link>
        <Link to="/notifications" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition">
          <span>🔔</span> Notifications
        </Link>
        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition">
          <span>👤</span> Profile
        </Link>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Banner - Dynamically pulling the user's name */}
          <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 shadow-xl">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Welcome Back, {user?.name || user?.username || 'Guest'}!
            </h1>
            <p className="text-slate-400 text-sm">Jump right back into your conversations or start a new group chat.</p>
          </div>

          {/* Quick Actions - These are fine as buttons since they act like cards */}
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => navigate('/dms')} className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition duration-200 group cursor-pointer">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💬</div>
                <div className="font-bold text-slate-200">New Direct Message</div>
                <div className="text-xs text-slate-500">Chat 1-on-1 with teammates</div>
              </button>
              <button onClick={() => navigate('/groups')} className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition duration-200 group cursor-pointer">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">👥</div>
                <div className="font-bold text-slate-200">Create Group</div>
                <div className="text-xs text-slate-500">Form a team chat room</div>
              </button>
              <button onClick={() => navigate('/channels')} className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition duration-200 group cursor-pointer">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📢</div>
                <div className="font-bold text-slate-200">Explore Channels</div>
                <div className="text-xs text-slate-500">Browse project channels</div>
              </button>
            </div>
          </div>

          {/* Recent Conversations */}
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Recent Conversations</h3>
            <div className="space-y-3">
              {recentChats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => navigate(`/${chat.type}`)}
                  className="p-4 bg-slate-900 border border-slate-800/80 hover:bg-slate-800/60 rounded-xl flex justify-between items-center transition cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-slate-200">{chat.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{chat.lastMessage}</div>
                  </div>
                  <span className="text-xs text-slate-500">{chat.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;