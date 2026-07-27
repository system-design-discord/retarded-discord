import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const handleRegister = (e) => {
    e.preventDefault();
    navigate('/dashboard'); // Changed from '/groups'
  };

  return (
    <div className="auth-wrapper">
      <div className="register-container">
        <div className="logo-placeholder">LOGO</div>
        <h1>Create Account</h1>
        <p>Join the messaging system to chat with users, groups, and channels.</p>
        
        <form className="register-form" onSubmit={handleRegister}>
          <div className="form-group"><label>Full Name</label><input type="text" placeholder="John Doe" /></div>
          <div className="form-group"><label>Username</label><input type="text" placeholder="john_doe" /></div>
          <div className="form-group"><label>Email</label><input type="email" placeholder="john@example.com" /></div>
          <div className="form-group"><label>Password</label><input type="password" placeholder="********" /></div>
          <div className="form-group"><label>Confirm Password</label><input type="password" placeholder="********" /></div>
          <div className="form-actions"><label><input type="checkbox" /> I agree to the rules.</label></div>
          <button type="submit">Create Account</button>
        </form>
        
        <div className="form-divider"><span>or</span></div>
        <div className="form-footer">
          <p>Already have an account? <Link to="/login"><strong>Login</strong></Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;