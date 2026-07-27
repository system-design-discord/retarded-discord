// src/components/settings/MyAccount.jsx

import React from 'react';

const MyAccount = () => {
  return (
    <div className="settings-panel">
      {/* Mapped to Settings Wireframe - My Account Screen */}
      <div className="settings-header">
        <h1>My Account</h1>
        <p>Manage your account identity, password, and login session.</p>
      </div>

      <div className="settings-section account-overview">
        <h3>Account Overview</h3>
        <div className="overview-card">
          <div className="avatar-placeholder">AV</div>
          <div className="user-info">
            <p><strong>Username:</strong> alex_morgan</p>
            <p><strong>Email:</strong> alex.morgan@example.com</p>
          </div>
          <button className="btn-edit-overview">Edit</button>
        </div>
      </div>

      <div className="settings-section">
        <h3>Edit Login Information</h3>
        <p>Update the username or email used for signing in to the system.</p>
        <form className="edit-login-form">
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input type="text" defaultValue="alex_morgan" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" defaultValue="alex.morgan@example.com" />
            </div>
          </div>
          <span className="helper-text">Changing email may require confirmation before the new email becomes active.</span>
        </form>
      </div>

      <div className="settings-section">
        <h3>Change Password</h3>
        <p>Set a new password for future logins.</p>
        <form className="change-password-form">
          <div className="form-row">
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" placeholder="********" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="********" />
            </div>
            <div className="form-group">
              <label>Confirm</label>
              <input type="password" placeholder="********" />
            </div>
          </div>
          <span className="helper-text">Password helper text: use at least 8 characters. The new password and confirmation must match.</span>
        </form>
      </div>

      <div className="settings-section session-logout">
        <h3>Session and Logout</h3>
        <div className="logout-row">
          <span>Current session: <strong>Active</strong></span>
          <button className="btn-logout">Log Out</button>
        </div>
      </div>

      <div className="settings-footer">
        <div className="feedback-state">
          Changes are saved after validation.
        </div>
        <div className="action-buttons">
          <button type="button" className="btn-cancel">Cancel</button>
          <button type="submit" className="btn-save">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;