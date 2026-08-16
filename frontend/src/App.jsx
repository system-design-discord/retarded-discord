import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import EditProfile from './components/profile/EditProfile';
import ViewProfile from './components/profile/ViewProfile';
import GroupChat from './components/groups/GroupChat';
import DirectMessages from './components/dms/DirectMessages';
import ChannelsDashboard from './components/channels/ChannelsDashboard';
import ChannelView from './components/channels/ChannelView';
import RoleManager from './components/channels/RoleManager';
import GroupsDashboard from './components/groups/GroupsDashboard';
import GroupSettings from './components/groups/GroupSettings';
import Dashboard from './components/dashboard/Dashboard';
import SearchMessages from './components/search/SearchMessages';
import NotificationsCenter from './components/notifications/NotificationsCenter';
import MyAccount from './components/settings/MyAccount';
import PrivacySettings from './components/settings/PrivacySettings';
import GroupInvitationPreferences from './components/settings/GroupInvitationPreferences';

// A simple 404 component matching the dark mode aesthetic
const NotFound = () => (
  <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
    <h1 className="text-6xl font-bold mb-4 text-slate-100">404</h1>
    <p className="text-xl text-slate-400 mb-8">This page doesn't exist.</p>
    <a href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
      Return to Dashboard
    </a>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation(); // Captures the current URL the user is trying to hit

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading…</div>;
  
  // If not logged in, redirect to login AND pass the target location in state
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* The bare root goes straight to the dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dms" element={<PrivateRoute><DirectMessages /></PrivateRoute>} />
        <Route path="/channels" element={<PrivateRoute><ChannelsDashboard /></PrivateRoute>} />
        {/* F-06 — the role manager is its own route rather than a modal on the
            dashboard above. It is reached from the channel it governs; the
            picker that stood in for that link while F-04 was unbuilt is gone. */}
        <Route path="/channels/:channelId" element={<PrivateRoute><ChannelView /></PrivateRoute>} />
        <Route path="/channels/:channelId/roles" element={<PrivateRoute><RoleManager /></PrivateRoute>} />
        <Route path="/groups" element={<PrivateRoute><GroupsDashboard /></PrivateRoute>} />
        {/* Both paths open the same view. SearchMessages links group hits at
            /chat/<group_id>, and the groups dashboard opens the nested one. */}
        <Route path="/chat/:groupId" element={<PrivateRoute><GroupChat /></PrivateRoute>} />
        <Route path="/groups/:groupId/chat" element={<PrivateRoute><GroupChat /></PrivateRoute>} />
        {/* U-10 — group settings is its own route rather than a modal over the
            chat. The chat's member aside is `hidden lg:block`, so on a phone
            this is the only way to the member list. The mirror of
            /channels/:channelId/roles. */}
        <Route path="/groups/:groupId/settings" element={<PrivateRoute><GroupSettings /></PrivateRoute>} />
        <Route path="/search" element={<PrivateRoute><SearchMessages /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationsCenter /></PrivateRoute>} />
        
        <Route path="/profile" element={<PrivateRoute><ViewProfile /></PrivateRoute>} />
        <Route path="/profile/edit" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
        {/* #101 — another user's profile. Keyed by **id**, because
            `/api/profile/<user_id>/` is, and declared after `/profile/edit` so
            the literal segment keeps winning the match. Without this route
            `ViewProfile`'s public branch was dead code: `useParams()` was
            always empty and every visit rendered the caller's own profile. */}
        <Route path="/profile/:userId" element={<PrivateRoute><ViewProfile /></PrivateRoute>} />
        <Route path="/settings/account" element={<PrivateRoute><MyAccount /></PrivateRoute>} />
        <Route path="/settings/privacy" element={<PrivateRoute><PrivacySettings /></PrivateRoute>} />
        <Route path="/settings/invitations" element={<PrivateRoute><GroupInvitationPreferences /></PrivateRoute>} />

        {/* Anything unrecognised lands on the 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;