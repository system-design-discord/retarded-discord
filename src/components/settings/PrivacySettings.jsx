import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacySettings = () => {
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
          <li onClick={() => navigate('/settings/account')}>My Account</li>
          <li onClick={() => navigate('/profile/edit')}>Profile</li>
          <li className="active" onClick={() => navigate('/settings/privacy')}>Privacy</li>
          <li onClick={() => navigate('/settings/invitations')}>Group Invitations</li>
        </ul>
      </aside>

      {/* Main Form Content */}
      <main className="settings-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="settings-header">
          <h1>Privacy Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Control who can contact you and view your profile.</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="settings-section">
            <h3>Direct Message Privacy</h3>
            <div className="toggle-row">
              <span>Allow direct messages from non-friends</span>
              <input type="radio" />
            </div>
            <div className="toggle-row">
              <span>Allow messages from users in shared groups</span>
              <input type="radio" defaultChecked />
            </div>
          </div>

          <div className="settings-section">
            <h3>Profile Visibility</h3>
            <div className="toggle-row">
              <span>Show my profile to other users</span>
              <input type="radio" defaultChecked />
            </div>
          </div>

          <div className="settings-footer">
            <div><strong>Feedback State</strong><p style={{ color: 'var(--text-secondary)' }}>Changes are saved after clicking Save Changes.</p></div>
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

export default PrivacySettings;