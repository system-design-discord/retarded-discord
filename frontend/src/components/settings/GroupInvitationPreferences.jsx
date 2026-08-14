import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import NavSidebar from '../layout/NavSidebar';
import SettingsTabs from './SettingsTabs';

const GroupInvitationPreferences = () => {
  // Mapping directly to the allow_invites requirement in the card
  const [allowInvites, setAllowInvites] = useState('approval');
  const [pendingInvites, setPendingInvites] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const fetchInvitationData = async () => {
      try {
        const [prefsRes, invitesRes] = await Promise.all([
          api.get('auth/preferences/'),
          api.get('groups/invites/pending/')
        ]);
        // Map the API's allow_invites field to our state
        if (prefsRes.data.allow_invites) {
          setAllowInvites(prefsRes.data.allow_invites);
        }
        setPendingInvites(invitesRes.data || []);
      } catch (err) {
        setFeedback({ type: 'error', message: 'Failed to load invitation data.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvitationData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.patch('auth/preferences/', { allow_invites: allowInvites });
      setFeedback({ type: 'success', message: 'Invitation preferences updated.' });
    } catch (err) {
      const errorMsg = err.response?.data?.allow_invites?.[0] || err.response?.data?.detail || 'An error occurred while saving.';
      setFeedback({ type: 'error', message: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteAction = async (id, action) => {
    try {
      await api.post(`groups/invites/${id}/${action}/`);
      setPendingInvites(prev => prev.filter(invite => invite.id !== id));
      setFeedback({ type: 'success', message: `Invitation ${action}ed.` });
    } catch (err) {
      setFeedback({ type: 'error', message: `Failed to ${action} invitation.` });
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/settings/invitations" />


      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <SettingsTabs />

        <div className="max-w-2xl mx-auto space-y-8">
          
          <div className="border-b border-slate-800 pb-6">
            <h1 className="text-3xl font-extrabold text-white mb-2">Group Invitation Preferences</h1>
            <p className="text-slate-400 text-sm">Choose who is allowed to add you to group conversations.</p>
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
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-6">Who Can Add Me to Groups</h3>
              <div className="space-y-3">
                {[
                  { id: 'everyone', label: 'Everyone' },
                  { id: 'friends', label: 'Friends / contacts only' },
                  { id: 'approval', label: 'Ask for my approval' },
                  { id: 'no-one', label: 'No one' }
                ].map((option) => (
                  <label key={option.id} className="flex items-center gap-3 p-4 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition cursor-pointer">
                    <input 
                      type="radio" 
                      name="allow_invites" 
                      value={option.id} 
                      checked={allowInvites === option.id} 
                      onChange={(e) => setAllowInvites(e.target.value)} 
                      className="w-4 h-4 accent-indigo-600 bg-slate-950 border-slate-700"
                    />
                    <span className="text-sm font-medium text-slate-200">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-6">Pending Group Invitations</h3>
              <div className="space-y-3">
                {pendingInvites.length > 0 ? (
                  pendingInvites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                      <div>
                        <strong className="text-sm text-slate-200 block">{invite.groupName || invite.group_name}</strong>
                        <span className="text-xs text-slate-500">Invited by @{invite.inviter || invite.inviter_username}</span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleInviteAction(invite.id, 'accept')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer">
                          Accept
                        </button>
                        <button type="button" onClick={() => handleInviteAction(invite.id, 'decline')} className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-xs font-semibold transition cursor-pointer">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">You have no pending group invitations.</p>
                )}
              </div>
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

export default GroupInvitationPreferences;