import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ identifier: '', password: '', rememberMe: false });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault(); 
    // API logic will go here
    navigate('/dashboard');
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
            <input 
              type="text" 
              value={credentials.identifier} 
              onChange={(e) => setCredentials({...credentials, identifier: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={credentials.password} 
              onChange={(e) => setCredentials({...credentials, password: e.target.value})} 
            />
          </div>
          <div className="form-actions">
            <label>
              <input 
                type="checkbox" 
                checked={credentials.rememberMe} 
                onChange={(e) => setCredentials({...credentials, rememberMe: e.target.checked})} 
              /> Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button type="submit">Login</button>
        </form>
        
        <div className="form-divider"><span>or</span></div>
        <div className="form-footer">
          <p>Do not have an account? <Link to="/register"><strong>Create an account</strong></Link></p>
        </div>

        {error && <div className="error-state" style={{ display: 'block' }}>{error}</div>}
      </div>
    </div>
  );
};

export default Login;