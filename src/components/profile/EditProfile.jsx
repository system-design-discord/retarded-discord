import React from 'react';
import { useNavigate } from 'react-router-dom';

const EditProfile = () => {
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
          <li className="active" onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      {/* Main Profile Area */}
      <main className="settings-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="profile-toggle" style={{ borderBottom: 'none', padding: '0 0 24px 0' }}>
          <button onClick={() => navigate('/profile')}>View Profile</button>
          <button className="active" onClick={() => navigate('/profile/edit')}>Edit Profile</button>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <h1>Edit Profile</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Update your public profile information, avatar, banner, and profile bio.</p>

          <div className="settings-section">
            <h3>Public Identity</h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Display Name</label>
              <input type="text" defaultValue="Alex Morgan" />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" defaultValue="alex_morgan" />
            </div>
          </div>

          <div className="settings-section">
            <h3>About Me</h3>
            <textarea style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-main)', color: 'var(--text-primary)' }} rows="4" defaultValue="Computer engineering student."></textarea>
          </div>

          <div className="visibility-reminder" style={{ background: 'var(--bg-sidebar)' }}>
            <div>
              <h3>Visibility Reminder</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Only public profile fields are edited here.</p>
            </div>
            <button type="button" className="btn-cancel">Privacy Safe</button>
          </div>

          <div className="settings-footer">
            <div><strong>Feedback State</strong><p style={{ color: 'var(--text-secondary)' }}>Profile changes are saved after validation.</p></div>
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

export default EditProfile;