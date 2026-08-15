import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { getMyProfile, normalizeProfile } from '../../services/profile';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';

// #97 — the own-profile read was `auth/me/`, which renders through
// `UserSerializer` and therefore carries no `bio`, so this screen showed the
// "has not set a bio yet" fallback to everybody including users who had set
// one. It reads `/api/profile/` through `services/profile` now.
//
// The *other* user's branch below is deliberately untouched: its endpoint is
// wrong and no route reaches it, which is #101 and somebody else's card. Both
// branches already answer `normalizeProfile`'s shape, so fixing it there is a
// one-line change rather than a rewrite of this file.

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
        if (isOwnProfile) {
          // If no specific username is in the URL, fetch my own profile
          setProfileUser(await getMyProfile());
        } else {
          // If a username is in the URL, fetch that specific user's public profile
          const response = await api.get(`users/profile/${targetUsername}/`);
          setProfileUser(normalizeProfile(response.data));
        }
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
            {/* An avatar can be saved since #104, so the screen that shows the
                profile has to render it — a letter where a picture was just
                uploaded reads as the same silent failure. The initial stays as
                the fallback for everybody who has not set one. */}
            {profileUser.avatar ? (
              <img
                src={profileUser.avatar}
                alt=""
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600/30 border-2 border-indigo-500 flex items-center justify-center font-extrabold text-2xl text-indigo-400 shrink-0">
                {profileUser.username ? profileUser.username[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold text-white break-words">{profileUser.username}</h2>
              <p className="text-xs text-slate-400 break-words">@{profileUser.username}</p>
              {/* Only show email if it's your own profile — PublicProfileSerializer
                  omits it for everybody else, so this is never somebody's address
                  handed to a stranger. */}
              {profileUser.email && (
                <p className="text-xs text-slate-500 mt-0.5 break-words">{profileUser.email}</p>
              )}
            </div>
          </div>

          {/* #130's one consequential omission: there was no way to start a
              direct message from a profile, so the user directory on the DM
              screen was the only entry to a conversation with anybody.
              `?user=<id>` is the route SearchMessages and the directory already
              open. This branch is unreachable until #101 gives another user's
              profile a route and the right endpoint. */}
          {!isOwnProfile && profileUser.id && (
            <button
              type="button"
              onClick={() => navigate(`/dms?user=${profileUser.id}`)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Message
            </button>
          )}

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">About Me</label>
            <p className="text-sm text-slate-300 break-words">{profileUser.bio || 'This user has not set a bio yet.'}</p>
          </div>

          {/* The wireframe's Profile Details block. Display name, status and
              short tag are not here and will not be: `Profile` has no column
              for any of them, and #130 settled them as cut from the wireframe
              rather than built. Same for Add Friend and Mutual Context, which
              need a friend entity ERD.tex does not have. */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold uppercase text-slate-500">Profile Details</label>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Username</dt>
                <dd className="text-slate-300 break-words text-right">{profileUser.username}</dd>
              </div>
              {profileUser.email && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="text-slate-300 break-words text-right">{profileUser.email}</dd>
                </div>
              )}
            </dl>
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