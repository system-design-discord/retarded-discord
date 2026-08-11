import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

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
        const response = await api.get('auth/me/');
        setBio(response.data.bio || '');
      } catch (err) {
        setFeedback({ type: 'error', message: 'Failed to load profile data.' });
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
      await api.patch('auth/me/', { bio });
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <main className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
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