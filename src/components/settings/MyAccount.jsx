import React from 'react';
import { useNavigate } from 'react-router-dom';

const MyAccount = () => {
  const navigate = useNavigate();

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      {/* Global Navigation Sidebar */}
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/dashboard')}>Home</li>
          <li onClick={() => navigate('/dms')}>Direct Messages</li>
          <li onClick={() => navigate('/groups')}>Groups</li>
          <li onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li className="active" onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      {/* Settings Sub-Navigation Sidebar */}
      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>User Settings</h3>
        <ul className="group-list">
          <li className="active" onClick={() => navigate('/settings/account')}>My Account</li>
          <li onClick={() => navigate('/profile/edit')}>Profile</li>
          <li onClick={() => navigate('/settings/privacy')}>Privacy</li>
          <li onClick={() => navigate('/settings/invitations')}>Group Invitations</li>
        </ul>
      </aside>

      {/* Main Form Content */}
      <main className="settings-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="settings-header">
          <h1>My Account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your account identity, password, and login session.</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="settings-section">
            <h3>Edit Login Information</h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Username</label>
              <input type="text" defaultValue="alex_morgan" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" defaultValue="alex.morgan@example.com" />
            </div>
          </div>

          <div className="settings-section">
            <h3>Change Password</h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Current Password</label>
              <input type="password" placeholder="********" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="********" />
            </div>
          </div>

          <div className="settings-footer">
            <div><strong>Feedback State</strong><p style={{ color: 'var(--text-secondary)' }}>Changes are saved after validation.</p></div>
            <div className="action-buttons">
              <button type="button" className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-save">Save Changes</button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default MyAccount;