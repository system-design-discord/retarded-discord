import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import EditProfile from './components/profile/EditProfile'; // همان کامپوننتی که در تصویر اول روی آن کار می‌کردید

// یک کامپوننت کمکی برای محافظت از مسیرهایی که نیاز به لاگین دارند
const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">در حال بارگذاری...</div>;
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* مسیرهای عمومی (بدون نیاز به لاگین) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* مسیرهای محافظت‌شده (نیاز به لاگین) */}
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <EditProfile />
            </PrivateRoute>
          } 
        />

        {/* مسیر پیش‌فرض: هدایت به پروفایل (که در صورت نداشتن لاگین، کاربر را به لاگین می‌فرستد) */}
        <Route path="*" element={<Navigate to="/profile" />} />
      </Routes>
    </Router>
  );
}

export default App;