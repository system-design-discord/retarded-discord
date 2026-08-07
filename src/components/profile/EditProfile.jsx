import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EditProfile = () => {
  const navigate = useNavigate();
  const [bio, setBio] = useState('Computer Engineering Student @ Sharif University. Working on CE-40418 Discord SPA.');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback('Profile updated successfully!');
    setTimeout(() => {
      navigate('/profile');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <main className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <h2 className="text-2xl font-extrabold text-white">Edit Profile</h2>

          {feedback && (
            <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 p-3 rounded-xl text-xs text-center font-bold">
              {feedback}
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
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditProfile;