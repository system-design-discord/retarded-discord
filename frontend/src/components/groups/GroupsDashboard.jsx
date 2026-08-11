import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateGroupModal from './CreateGroupModal';

const INITIAL_GROUPS = [
  { id: 1, name: 'CE-40418 Discord Project', memberCount: 6, lastMessage: 'Arvin: Sprint 2 review is tomorrow.', active: true },
  { id: 2, name: 'Frontend Study Squad', memberCount: 3, lastMessage: 'Amir: React SPA & Tailwind components ready.', active: false },
  { id: 3, name: 'System Analysis Group', memberCount: 4, lastMessage: 'Arman: ERD models migrated to Django.', active: false }
];

const GroupsDashboard = () => {
  const navigate = useNavigate();
  const [groups] = useState(INITIAL_GROUPS);
  const [showModal, setShowModal] = useState(false);

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
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
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
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </button>
      </aside>

      {/* Main Groups Panel */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Your Groups</h1>
              <p className="text-slate-400 text-sm mt-1">Manage and participate in private group conversations.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              + New Group
            </button>
          </div>

          <div className="grid gap-4">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => navigate(`/chat/${group.id}`)}
                className="p-5 bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-800/60 rounded-2xl transition cursor-pointer flex justify-between items-center group"
              >
                <div>
                  <h3 className="text-base font-bold text-slate-200 group-hover:text-indigo-400 transition">{group.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{group.lastMessage}</p>
                </div>
                <span className="text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full">
                  {group.memberCount} Members
                </span>
              </div>
            ))}
          </div>
        </div>

        {showModal && (
  <CreateGroupModal 
    onClose={() => setShowModal(false)} 
    onGroupCreated={(newGroup) => setGroups(prevGroups => [newGroup, ...prevGroups])} 
  />
)}
      </main>
    </div>
  );
};

export default GroupsDashboard;