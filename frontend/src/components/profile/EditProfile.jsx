import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, updateMyProfile } from '../../services/profile';
import { readApiError } from '../../lib/apiError';
import NavSidebar from '../layout/NavSidebar';

// U-13 — this screen had no navigation at all: the only ways out were its own
// Save and Cancel buttons, so a reload landed the user somewhere with no rail.
// It renders the shared one now like every other screen.
//
// #96 and #97 — it read `auth/me/`, which does not carry `bio`, and saved with
// a `PATCH` at the same route, which is a 405. So the editor opened blank for
// everybody and threw away everything typed into it. Both ends go through
// `services/profile` now, which is where that endpoint is named once.

const EditProfile = () => {
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Fetch current bio on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getMyProfile();
        setBio(profile.bio);
      } catch (err) {
        setFeedback({ type: 'error', message: readApiError(err, 'Failed to load profile data.') });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      await updateMyProfile({ bio });
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err) {
      setFeedback({ type: 'error', message: readApiError(err, 'Failed to update profile.') });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/profile" />

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <h2 className="text-2xl font-extrabold text-white">Edit Profile</h2>

          {feedback.message && (
            <div className={`p-3 rounded-xl text-xs text-center font-bold border ${
              feedback.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
            }`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Profile Avatar</label>
              <input type="file" accept="image/*" className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-2">About Me (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows="4"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                placeholder="Tell us about yourself..."
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditProfile;