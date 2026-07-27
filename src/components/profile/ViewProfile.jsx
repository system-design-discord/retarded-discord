import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ViewProfile = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);

  // Example API fetch simulator
  // useEffect(() => { fetchProfile().then(data => setProfileData(data)) }, []);

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
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

      <main className="settings-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="profile-toggle" style={{ borderBottom: 'none', padding: '0 0 24px 0' }}>
          <button className="active" onClick={() => navigate('/profile')}>View Profile</button>
          <button onClick={() => navigate('/profile/edit')}>Edit Profile</button>
        </div>
        
        <div>
          <h1>View Profile</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>View another user's public profile information and start a conversation.</p>
          
          {profileData ? (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
              <div className="profile-banner">Profile Banner / Cover Area</div>
              <div className="profile-header">
                <div className="avatar-placeholder" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>AV</div>
                <div className="user-titles">
                  <h2>{profileData.displayName}</h2>
                  <span style={{ color: 'var(--text-secondary)' }}>@{profileData.username}</span>
                </div>
                <div className="profile-actions">
                  <button type="button">Message</button>
                  <button type="button">Add Friend</button>
                </div>
              </div>
              
              <div style={{ padding: '24px' }}>
                <h3>About Me</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{profileData.bio}</p>
              </div>
              
              <div className="profile-details-grid">
                <div>
                  <h3>Profile Details</h3>
                  <p><strong>Display Name:</strong> {profileData.displayName}</p>
                  <p><strong>Status:</strong> {profileData.status}</p>
                </div>
                <div>
                  <h3>Mutual Context</h3>
                  <div className="badges" style={{ marginTop: '8px' }}>
                    {profileData.mutualContext?.map(context => (
                      <span key={context}>{context}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div style={{ textAlign: 'center', padding: '40px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No profile data loaded.</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewProfile;