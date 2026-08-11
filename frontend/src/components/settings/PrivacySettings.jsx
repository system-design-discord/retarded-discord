import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const PrivacySettings = () => {
  const [privacyConfig, setPrivacyConfig] = useState({
    allowDMsFromNonFriends: false,
    allowSharedGroupDMs: false,
    showProfile: false
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Fetch current privacy settings on load to survive reloads
  useEffect(() => {
    const fetchPrivacySettings = async () => {
      try {
        const response = await api.get('auth/privacy/');
        setPrivacyConfig(response.data);
      } catch (err) {
        setFeedback({ type: 'error', message: 'Failed to load privacy settings.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrivacySettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.patch('auth/privacy/', privacyConfig);
      setFeedback({ type: 'success', message: 'Privacy settings updated successfully.' });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'An error occurred while saving your privacy settings.';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Primary Sidebar */}
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
        <Link to="/notifications" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </Link>
        <Link to="/settings/account" className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>⚙️</span> Settings
        </Link>
      </aside>

      {/* Secondary Sidebar */}
      <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">User Settings</div>
        <Link to="/settings/account" className="flex items-center px-4 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          My Account
        </Link>
        <Link to="/profile/edit" className="flex items-center px-4 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          Profile
        </Link>
        <Link to="/settings/privacy" className="flex items-center px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl font-medium transition cursor-pointer">
          Privacy
        </Link>
        <Link to="/settings/invitations" className="flex items-center px-4 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          Group Invitations
        </Link>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          
          <div className="border-b border-slate-800 pb-6">
            <h1 className="text-3xl font-extrabold text-white mb-2">Privacy Settings</h1>
            <p className="text-slate-400 text-sm">Control who can contact you and view your profile.</p>
          </div>

          {feedback.message && (
            <div className={`p-4 rounded-xl text-sm font-semibold border ${
              feedback.type === 'error' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
            }`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-6">Direct Message Privacy</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition cursor-pointer">
                  <span className="text-sm font-medium text-slate-200">Allow direct messages from non-friends</span>
                  <input 
                    type="checkbox" 
                    checked={privacyConfig.allowDMsFromNonFriends} 
                    onChange={() => setPrivacyConfig({...privacyConfig, allowDMsFromNonFriends: !privacyConfig.allowDMsFromNonFriends})} 
                    className="w-5 h-5 accent-indigo-600 rounded bg-slate-950 border-slate-700"
                  />
                </label>
                <label className="flex items-center justify-between p-4 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition cursor-pointer">
                  <span className="text-sm font-medium text-slate-200">Allow messages from users in shared groups</span>
                  <input 
                    type="checkbox" 
                    checked={privacyConfig.allowSharedGroupDMs} 
                    onChange={() => setPrivacyConfig({...privacyConfig, allowSharedGroupDMs: !privacyConfig.allowSharedGroupDMs})} 
                    className="w-5 h-5 accent-indigo-600 rounded bg-slate-950 border-slate-700"
                  />
                </label>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-6">Profile Visibility</h3>
              <label className="flex items-center justify-between p-4 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition cursor-pointer">
                <span className="text-sm font-medium text-slate-200">Show my profile to other users</span>
                <input 
                  type="checkbox" 
                  checked={privacyConfig.showProfile} 
                  onChange={() => setPrivacyConfig({...privacyConfig, showProfile: !privacyConfig.showProfile})} 
                  className="w-5 h-5 accent-indigo-600 rounded bg-slate-950 border-slate-700"
                />
              </label>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PrivacySettings;