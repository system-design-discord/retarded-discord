import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      {/* Global Navigation Sidebar */}
      <aside className="groups-sidebar">
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

      {/* Main Dashboard Area */}
      <main className="settings-panel">
        <div className="settings-header">
          <h1>Welcome back, Alex</h1>
          <p>Jump back into a conversation, or start something new.</p>
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '16px' }}>Recent Conversations</h3>
          
          <div className="notification-card" style={{ cursor: 'pointer' }}>
            <div className="content">
              <strong>Sam Lee</strong>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>"see you then"</p>
            </div>
          </div>
          
          <div className="notification-card" style={{ cursor: 'pointer' }}>
            <div className="content">
              <strong>Project Team</strong>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>"files uploaded"</p>
            </div>
          </div>
          
          <div className="notification-card" style={{ cursor: 'pointer' }}>
            <div className="content">
              <strong># backend</strong>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>"PR merged"</p>
            </div>
          </div>
          
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>Open any row to jump straight back into that chat.</p>
        </div>

        <div className="settings-section">
          <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
          <div className="action-buttons">
            <button className="btn-cancel" onClick={() => navigate('/dms')}>+ New DM</button>
            <button className="btn-cancel" onClick={() => navigate('/groups')}>+ New Group</button>
            <button className="btn-cancel" onClick={() => navigate('/channels')}>Browse Channels</button>
          </div>
        </div>

        <div className="live-delivery-notice">
          <strong style={{ display: 'block', marginBottom: '4px' }}>Empty-Conversation Hint</strong>
          <p style={{ margin: 0 }}>Shown to brand-new accounts with no chats yet: "You have not joined any conversations. Start a direct message, form a group, or browse channels above."</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;