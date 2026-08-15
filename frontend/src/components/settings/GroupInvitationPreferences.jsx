import React, { useState, useEffect } from 'react';
import { getAllowInvites, setAllowInvites as saveAllowInvites } from '../../services/privacy';
import { readApiError } from '../../lib/apiError';
import NavSidebar from '../layout/NavSidebar';
import SettingsTabs from './SettingsTabs';

// US-5.4 / SH.2 and doc.tex §4.5 — "A user may choose not to allow anyone to
// add them to a group."
//
// **The pending-invitations half of this screen is gone (#100).** It listed
// invitations from `groups/invites/pending/` and answered them at
// `groups/invites/<id>/<action>/`, and all four endpoints this file called were
// 404s: there is no invite/approval flow in the backend and there will not be
// one. Execution-plan deviation 30 settled that on doc.tex rather than on the
// wireframe — §4.5's rule is a boolean opt-out checked when a member is added,
// not an invitation that is sent, queued and then answered — so the card is a
// removal. `#133` cut the matching Accept/Decline buttons off the notification
// row for the same reason.
//
// Removing the list also took the SPA's last raw read of a paginated body with
// it (#102). `setPendingInvites(invitesRes.data || [])` was issue #77's pattern
// surviving in the one place nobody could observe it, because the endpoint it
// read 404'd before the parse ever ran.
//
// **Four options become two, and that is the honest number.** The wireframe
// draws Everyone / Friends or contacts only / Ask for my approval / No one.
// `Profile.allow_invites` is a boolean, so only the first and the last are
// answerable: there is no friends or contacts concept in `ERD.tex`, and *ask
// for my approval* is precisely the flow deviation 30 refuses to build. Two
// radios that mean something beat four where two are decoration.

const OPTIONS = [
  {
    id: 'everyone',
    value: true,
    label: 'Everyone',
    hint: 'Any user can add you to a group directly.',
  },
  {
    id: 'no-one',
    value: false,
    label: 'No one',
    hint: 'Disable group invitations entirely: no user may add you to a group.',
  },
];

const GroupInvitationPreferences = () => {
  // `Profile.allow_invites` — a boolean, so this is one too.
  const [allowInvites, setAllowInvites] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const fetchInvitationData = async () => {
      try {
        setAllowInvites(await getAllowInvites());
      } catch (caught) {
        setFeedback({
          type: 'error',
          message: readApiError(caught, 'Your invitation preference could not be loaded.'),
        });
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
      // Seed from what was stored, not from what was sent.
      setAllowInvites(await saveAllowInvites(allowInvites));
      setFeedback({ type: 'success', message: 'Invitation preferences updated.' });
    } catch (caught) {
      setFeedback({
        type: 'error',
        message: readApiError(caught, 'Your invitation preference could not be saved.'),
      });
    } finally {
      setIsSaving(false);
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
              <p className="text-slate-400 text-xs mb-4">
                This setting applies to every group invite sent to you across the system. Nobody can
                read it but you — an inviter finds out only when the API refuses them.
              </p>
              <div className="space-y-3">
                {OPTIONS.map((option) => (
                  <label key={option.id} className="flex items-start gap-3 p-4 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition cursor-pointer">
                    <input
                      type="radio"
                      name="allow_invites"
                      value={option.id}
                      checked={allowInvites === option.value}
                      onChange={() => setAllowInvites(option.value)}
                      className="w-4 h-4 mt-0.5 shrink-0 accent-indigo-600 bg-slate-950 border-slate-700"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-200">{option.label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{option.hint}</span>
                    </span>
                  </label>
                ))}
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