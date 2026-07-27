// src/components/auth/Register.jsx

import React from 'react';

const Register = () => {
  return (
    <div className="register-container">
      {/* Mapped to Guest Wireframe - Register Screen */}
      <div className="logo-placeholder">LOGO</div>
      
      <h1>Create Account</h1>
      <p>Join the messaging system to chat with users, groups, and channels.</p>
      
      <form className="register-form">
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" placeholder="John Doe" />
        </div>
        
        <div className="form-group">
          <label>Username</label>
          <input type="text" placeholder="john_doe" />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="john@example.com" />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="********" />
        </div>
        
        <div className="form-group">
          <label>Confirm Password</label>
          <input type="password" placeholder="********" />
        </div>
        
        <div className="form-actions">
          <label>
            <input type="checkbox" /> I agree to the basic account rules and privacy policy.
          </label>
        </div>
        
        <button type="submit">Create Account</button>
      </form>
      
      <div className="form-footer">
        <span>or</span>
        <p>Already have an account? <a href="/login">Login</a></p>
      </div>
      
      {/* Error state placeholder */}
      <div className="error-state hidden">
        Error state: Required fields are missing or passwords do not match.
      </div>
    </div>
  );
};

export default Register;