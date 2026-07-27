import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Main Navigation Components
import Dashboard from './components/dashboard/Dashboard';
import DirectMessages from './components/dms/DirectMessages';
import GroupsDashboard from './components/groups/GroupsDashboard';
import ChannelsDashboard from './components/channels/ChannelsDashboard';
import SearchMessages from './components/search/SearchMessages';
import NotificationsCenter from './components/notifications/NotificationsCenter';

// Profile Components
import ViewProfile from './components/profile/ViewProfile';
import EditProfile from './components/profile/EditProfile';

// Settings Components
import MyAccount from './components/settings/MyAccount';
import PrivacySettings from './components/settings/PrivacySettings';
import GroupInvitationPreferences from './components/settings/GroupInvitationPreferences';

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Main Interface Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dms" element={<DirectMessages />} />
        <Route path="/groups" element={<GroupsDashboard />} />
        <Route path="/channels" element={<ChannelsDashboard />} />
        <Route path="/search" element={<SearchMessages />} />
        <Route path="/notifications" element={<NotificationsCenter />} />
        
        {/* Profile Routes */}
        <Route path="/profile" element={<ViewProfile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        
        {/* Settings Routes */}
        <Route path="/settings/account" element={<MyAccount />} />
        <Route path="/settings/privacy" element={<PrivacySettings />} />
        <Route path="/settings/invitations" element={<GroupInvitationPreferences />} />
      </Routes>
    </Router>
  );
}

export default App;