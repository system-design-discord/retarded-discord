import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import SettingsTabs from './SettingsTabs';

const MyAccount = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // US-1.3 — the only place in the app a user can actually log out. The context
  // blacklists the refresh token server-side before clearing localStorage.
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  
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
      <NavSidebar active="/settings/account" />


      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <SettingsTabs />

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

          {/* US-1.3 — log out */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Log out</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ends this session everywhere it can be ended: the refresh token is invalidated on the server.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-6 py-2.5 bg-slate-800 hover:bg-rose-600/80 border border-slate-700 hover:border-rose-500 text-slate-200 hover:text-white rounded-xl font-semibold transition cursor-pointer shrink-0"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyAccount;