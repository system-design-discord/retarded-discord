import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [recentChats, setRecentChats] = useState([]); // Empty by default

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li className="active" onClick={() => navigate('/dashboard')}>Home</li>
          <li onClick={() => navigate('/dms')}>Direct Messages</li>
          <li onClick={() => navigate('/groups')}>Groups</li>
          <li onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      <main className="settings-panel">
        <div className="settings-header">
          <h1>Welcome back{currentUser ? `, ${currentUser.firstName}` : ''}</h1>
          <p>Jump back into a conversation, or start something new.</p>
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '16px' }}>Recent Conversations</h3>
          
          {recentChats.length > 0 ? (
            recentChats.map((chat) => (
              <div key={chat.id} className="notification-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/${chat.type}/${chat.id}`)}>
                <div className="content">
                  <strong>{chat.title}</strong>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{chat.lastMessage}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="live-delivery-notice" style={{ margin: '0' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Empty-Conversation Hint</strong>
              <p style={{ margin: 0 }}>You have not joined any conversations. Start a direct message, form a group, or browse channels above.</p>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
          <div className="action-buttons">
            <button className="btn-cancel" onClick={() => navigate('/dms')}>+ New DM</button>
            <button className="btn-cancel" onClick={() => navigate('/groups')}>+ New Group</button>
            <button className="btn-cancel" onClick={() => navigate('/channels')}>Browse Channels</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;