import React, { useState, useEffect, useRef } from 'react';
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
  // #104 — the file input was bound to nothing at all: no onChange, no ref, no
  // state, and no mention of the file in the submit handler. Picking an avatar
  // put a filename in the control and then silently discarded it, which is the
  // most misleading of this screen's failures because it looked like it worked.
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Fetch current bio on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getMyProfile();
        setBio(profile.bio);
        setAvatarUrl(profile.avatar);
      } catch (err) {
        setFeedback({ type: 'error', message: readApiError(err, 'Failed to load profile data.') });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // The preview is an object URL over the chosen file, so it has to be revoked
  // or the blob outlives the screen. Only ours are revoked — the saved avatar
  // arrives as an ordinary /media/ URL.
  const previewRef = useRef(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : null;
    setAvatar(file);
    setAvatarUrl(previewRef.current ?? avatarUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const saved = await updateMyProfile(avatar ? { bio, avatar } : { bio });
      setAvatarUrl(saved.avatar);
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
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-600/30 border-2 border-indigo-500 shrink-0" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="min-w-0 text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>
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