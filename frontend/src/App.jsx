import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import EditProfile from './components/profile/EditProfile';
import ViewProfile from './components/profile/ViewProfile';
import Chat from './components/chat/Chat'; 
import DirectMessages from './components/dms/DirectMessages';
import ChannelsDashboard from './components/channels/ChannelsDashboard';
import GroupsDashboard from './components/groups/GroupsDashboard';
import Dashboard from './components/dashboard/Dashboard';
import SearchMessages from './components/search/SearchMessages';
import NotificationsCenter from './components/notifications/NotificationsCenter';
import MyAccount from './components/settings/MyAccount';
import PrivacySettings from './components/settings/PrivacySettings';
import GroupInvitationPreferences from './components/settings/GroupInvitationPreferences';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">در حال بارگذاری...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* آدرس اصلی خروجی مستقیم می‌ره به داشبورد اصلی */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dms" element={<PrivateRoute><DirectMessages /></PrivateRoute>} />
        <Route path="/channels" element={<PrivateRoute><ChannelsDashboard /></PrivateRoute>} />
        <Route path="/groups" element={<PrivateRoute><GroupsDashboard /></PrivateRoute>} />
        <Route path="/chat/:groupId" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/search" element={<PrivateRoute><SearchMessages /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationsCenter /></PrivateRoute>} />
        
        <Route path="/profile" element={<PrivateRoute><ViewProfile /></PrivateRoute>} />
        <Route path="/profile/edit" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
        <Route path="/settings/account" element={<PrivateRoute><MyAccount /></PrivateRoute>} />
        <Route path="/settings/privacy" element={<PrivateRoute><PrivacySettings /></PrivateRoute>} />
        <Route path="/settings/invitations" element={<PrivateRoute><GroupInvitationPreferences /></PrivateRoute>} />

        {/* روت‌های ناشناخته هم می‌رن به داشبورد اصلی */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;