import React from 'react';
import { useNavigate } from 'react-router-dom';

const ViewProfile = () => {
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
          <button className="active" onClick={() => navigate('/profile')}>View Profile</button>
          <button onClick={() => navigate('/profile/edit')}>Edit Profile</button>
        </div>
        
        <div>
          <h1>View Profile</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>View another user's public profile information and start a conversation.</p>
          
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <div className="profile-banner">Profile Banner / Cover Area</div>
            <div className="profile-header">
              <div className="avatar-placeholder" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>AV</div>
              <div className="user-titles">
                <h2>Alex Morgan</h2>
                <span style={{ color: 'var(--text-secondary)' }}>@alex_morgan</span>
              </div>
              <div className="profile-actions">
                <button type="button">Message</button>
                <button type="button">Add Friend</button>
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              <h3>About Me</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Computer engineering student. Interested in backend development, system design, and group projects.</p>
            </div>
            
            <div className="profile-details-grid">
              <div>
                <h3>Profile Details</h3>
                <p><strong>Display Name:</strong> Alex Morgan</p>
                <p><strong>Status:</strong> Online</p>
              </div>
              <div>
                <h3>Mutual Context</h3>
                <div className="badges" style={{ marginTop: '8px' }}>
                  <span>Project Group</span>
                  <span>#backend</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="view-state-footer" style={{ marginTop: '24px', borderRadius: '8px', background: 'var(--bg-sidebar)' }}>
          <div><strong>View State</strong><p style={{ color: 'var(--text-secondary)' }}>Public profile loaded successfully.</p></div>
          <button className="btn-cancel">Close Profile</button>
        </div>
      </main>
    </div>
  );
};

export default ViewProfile;