import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '', agreed: false });
  const [error, setError] = useState('');

  const handleRegister = (e) => {
    e.preventDefault();
    // API logic will go here
    navigate('/dashboard');
  };

  return (
    <div className="auth-wrapper">
      <div className="register-container">
        <div className="logo-placeholder">LOGO</div>
        <h1>Create Account</h1>
        <p>Join the messaging system to chat with users, groups, and channels.</p>
        
        <form className="register-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
          </div>
          <div className="form-actions">
            <label>
              <input type="checkbox" checked={formData.agreed} onChange={(e) => setFormData({...formData, agreed: e.target.checked})} /> I agree to the rules.
            </label>
          </div>
          <button type="submit">Create Account</button>
        </form>
        
        <div className="form-divider"><span>or</span></div>
        <div className="form-footer">
          <p>Already have an account? <Link to="/login"><strong>Login</strong></Link></p>
        </div>

        {error && <div className="error-state" style={{ display: 'block' }}>{error}</div>}
      </div>
    </div>
  );
};

export default Register;