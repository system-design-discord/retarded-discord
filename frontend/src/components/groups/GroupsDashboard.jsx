import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CreateGroupModal from './CreateGroupModal';
import api from '../../services/api';

const GroupsDashboard = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Fetch only the groups this user belongs to
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await api.get('groups/');
        setGroups(response.data);
      } catch (err) {
        console.error("Failed to fetch groups", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation - Upgraded to Links and standardized emojis */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🏠</span> Home
        </Link>
        <Link to="/dms" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>💬</span> Direct Messages
        </Link>
        <Link to="/groups" className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>👥</span> Groups
        </Link>
        <Link to="/channels" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>📢</span> Channels
        </Link>
        <Link to="/search" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔍</span> Search
        </Link>
        <Link to="/notifications" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </Link>
        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </Link>
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

          {isLoading ? (
            <div className="text-center py-10 text-slate-500">Loading your groups...</div>
          ) : groups.length > 0 ? (
            <div className="grid gap-4">
              {groups.map(group => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/chat/${group.id}`)}
                  className="p-5 bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-800/60 rounded-2xl transition cursor-pointer flex justify-between items-center group"
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-200 group-hover:text-indigo-400 transition">
                      {group.name || group.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {group.lastMessage || 'No messages yet.'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full">
                    {group.memberCount || group.members?.length || 1} Members
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* Acceptance Criteria: Empty state is handled */
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-bold text-slate-200 mb-2">No Groups Yet</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                You haven't joined any groups. Create a new group to start chatting with your teammates.
              </p>
            </div>
          )}
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