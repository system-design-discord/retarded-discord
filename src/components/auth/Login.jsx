// src/components/auth/Login.jsx

import React from 'react';

const Login = () => {
  return (
    <div className="login-container">
      {/* Mapped to Guest Wireframe - Login Screen */}
      <div className="logo-placeholder">LOGO</div>
      
      <h1>Welcome Back</h1>
      <p>Sign in to continue to your messages, groups, and channels.</p>
      
      <form className="login-form">
        <div className="form-group">
          <label>Email or Username</label>
          <input type="text" placeholder="example@email.com" />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="********" />
        </div>
        
        <div className="form-actions">
          <label>
            <input type="checkbox" /> Remember me
          </label>
          <a href="/forgot-password">Forgot password?</a>
        </div>
        
        <button type="submit">Login</button>
      </form>
      
      <div className="form-footer">
        <span>or</span>
        <p>Do not have an account? <a href="/register">Create an account</a></p>
      </div>
      
      {/* Error state placeholder */}
      <div className="error-state hidden">
        Error state: Invalid email, username, or password.
      </div>
    </div>
  );
};

export default Login;