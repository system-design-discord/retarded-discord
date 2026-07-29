import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import EditProfile from './components/profile/EditProfile';
import Chat from './components/chat/Chat'; 

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">در حال بارگذاری...</div>;
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <EditProfile />
            </PrivateRoute>
          } 
        />
        
        {/* مسیر جدید برای چت روم (نیاز به لاگین دارد) */}
        <Route 
          path="/chat/:groupId" 
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/profile" />} />
      </Routes>
    </Router>
  );
}

export default App;