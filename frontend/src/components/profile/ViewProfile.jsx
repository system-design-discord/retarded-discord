import React from 'react';
import { useNavigate } from 'react-router-dom';

const ViewProfile = () => {
  const navigate = useNavigate();

  const mockUser = {
    username: "Amir",
    email: "amir@example.com",
    role: "Frontend Lead",
    bio: "Computer Engineering Student @ Sharif University. Working on CE-40418 Discord SPA."
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
        <button onClick={() => navigate('/notifications')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </button>
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-indigo-600/30 border-2 border-indigo-500 flex items-center justify-center font-extrabold text-2xl text-indigo-400">
              A
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">{mockUser.username}</h2>
              <p className="text-xs text-indigo-400 font-semibold">{mockUser.role}</p>
              <p className="text-xs text-slate-500 mt-0.5">{mockUser.email}</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">About Me</label>
            <p className="text-sm text-slate-300">{mockUser.bio}</p>
          </div>

          <button
            onClick={() => navigate('/profile/edit')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            Edit Profile
          </button>
        </div>
      </main>
    </div>
  );
};

export default ViewProfile;