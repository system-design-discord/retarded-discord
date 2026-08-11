import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const MyAccount = () => {
  const { user, login } = useContext(AuthContext); // We might need login to refresh token if username changes
  
  const [accountInfo, setAccountInfo] = useState({ username: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' }); // type: 'success' or 'error'

  // Fetch current user details on load
  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const response = await api.get('auth/me/');
        setAccountInfo({
          username: response.data.username || '',
          email: response.data.email || ''
        });
      } catch (err) {
        setFeedback({ type: 'error', message: 'Failed to load account details.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccountDetails();
  }, []);

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      // Assuming the backend endpoint for updating the user is a PATCH to auth/me/
      await api.patch('auth/me/', accountInfo);
      
      // If they also entered a new password, send a separate request
      if (passwords.current && passwords.new) {
        // Assuming there is a dedicated password change endpoint
        await api.post('auth/password/change/', {
          old_password: passwords.current,
          new_password: passwords.new
        });
        setPasswords({ current: '', new: '' }); // Clear password fields on success
      }

      setFeedback({ type: 'success', message: 'Account details updated successfully.' });
    } catch (err) {
       // Catch and display specific validation errors from the API (Acceptance Criteria)
      const errorMsg = err.response?.data?.detail 
        || err.response?.data?.username?.[0] 
        || err.response?.data?.email?.[0]
        || err.response?.data?.old_password?.[0]
        || err.response?.data?.new_password?.[0]
        || 'An error occurred while saving your changes.';
        
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
      {/* Primary Sidebar (Matching Dashboard & DMs) */}
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

      {/* Secondary Sidebar (Settings Menu) */}
      <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">User Settings</div>
        <Link to="/settings/account" className="flex items-center px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl font-medium transition cursor-pointer">
          My Account
        </Link>
        <Link to="/profile/edit" className="flex items-center px-4 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          Profile
        </Link>
        <Link to="/settings/privacy" className="flex items-center px-4 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
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
            <h1 className="text-3xl font-extrabold text-white mb-2">My Account</h1>
            <p className="text-slate-400 text-sm">Manage your account identity, password, and login session.</p>
          </div>

          {/* Validation Feedback Banner */}
          {feedback.message && (
            <div className={`p-4 rounded-xl text-sm font-semibold border ${
              feedback.type === 'error' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
            }`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleUpdateAccount} className="space-y-8">
            
            {/* Account Info Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Edit Login Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Username</label>
                  <input 
                    type="text" 
                    required
                    value={accountInfo.username} 
                    onChange={e => setAccountInfo({...accountInfo, username: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Email</label>
                  <input 
                    type="email" 
                    required
                    value={accountInfo.email} 
                    onChange={e => setAccountInfo({...accountInfo, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm" 
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Change Password</h3>
              <p className="text-xs text-slate-500 mb-4">Leave these blank if you do not want to change your password.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Current Password</label>
                  <input 
                    type="password" 
                    value={passwords.current} 
                    onChange={e => setPasswords({...passwords, current: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-2">New Password</label>
                  <input 
                    type="password" 
                    value={passwords.new} 
                    onChange={e => setPasswords({...passwords, new: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" onClick={() => setFeedback({type: '', message: ''})} className="px-6 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 font-medium transition cursor-pointer">
                Clear
              </button>
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

export default MyAccount;