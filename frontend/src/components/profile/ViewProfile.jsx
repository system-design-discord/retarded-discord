import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';

const ViewProfile = () => {
  const navigate = useNavigate();
  // Grab the username from the URL (if one exists)
  const { username: targetUsername } = useParams();
  // Get the currently logged-in user from context
  const { user: currentUser } = useContext(AuthContext);

  const [profileUser, setProfileUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  // Determine if the profile being viewed belongs to the logged-in user
  const isOwnProfile = !targetUsername || (currentUser && targetUsername === currentUser.username);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setIsNotFound(false);
      try {
        let response;
        if (isOwnProfile) {
          // If no specific username is in the URL, fetch my own profile
          response = await api.get('auth/me/');
        } else {
          // If a username is in the URL, fetch that specific user's public profile
          response = await api.get(`users/profile/${targetUsername}/`);
        }
        setProfileUser(response.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setIsNotFound(true);
        } else {
          console.error("Error fetching profile:", err);
          // Fallback to not found state on other errors just to be safe based on AC
          setIsNotFound(true); 
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [targetUsername, isOwnProfile]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading profile...</div>;
  }

  // Acceptance Criteria: a missing user shows a not-found state
  if (isNotFound || !profileUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <h2 className="text-4xl font-bold mb-4">User Not Found</h2>
        <p className="text-slate-400 mb-6">The profile you are looking for does not exist.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/profile" />

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-indigo-600/30 border-2 border-indigo-500 flex items-center justify-center font-extrabold text-2xl text-indigo-400">
              {profileUser.username ? profileUser.username[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">{profileUser.username}</h2>
              <p className="text-xs text-indigo-400 font-semibold">{profileUser.role || 'Member'}</p>
              {/* Only show email if it's your own profile or if the API explicitly returns it based on privacy settings */}
              {profileUser.email && (
                <p className="text-xs text-slate-500 mt-0.5">{profileUser.email}</p>
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">About Me</label>
            <p className="text-sm text-slate-300">{profileUser.bio || 'This user has not set a bio yet.'}</p>
          </div>

          {/* Acceptance Criteria: your own profile shows the edit affordance and theirs does not */}
          {isOwnProfile && (
            <button
              onClick={() => navigate('/profile/edit')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Edit Profile
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewProfile;