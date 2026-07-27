import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const handleLogin = (e) => {
    e.preventDefault(); 
    navigate('/dashboard'); // Changed from '/groups'
  };

  return (
    <div className="auth-wrapper">
      <div className="login-container">
        <div className="logo-placeholder">LOGO</div>
        <h1>Welcome Back</h1>
        <p>Sign in to continue to your messages, groups, and channels.</p>
        
        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email or Username</label>
            <input type="text" placeholder="example@email.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="********" />
          </div>
          <div className="form-actions">
            <label><input type="checkbox" /> Remember me</label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button type="submit">Login</button>
        </form>
        
        <div className="form-divider"><span>or</span></div>
        <div className="form-footer">
          <p>Do not have an account? <Link to="/register"><strong>Create an account</strong></Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;