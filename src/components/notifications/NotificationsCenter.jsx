import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotificationsCenter = () => {
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
          <li className="active" onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      {/* Notifications Main Content */}
      <main className="settings-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <header className="notifications-header" style={{ padding: '0 0 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', borderBottom: 'none' }}>
          <div>
            <h1>Notifications</h1>
            <p style={{ color: 'var(--text-secondary)' }}>New activity across your chats, groups, and channels.</p>
          </div>
          <button type="button">Mark all read</button>
        </header>

        <div className="notifications-tabs" style={{ background: 'transparent', padding: '0 0 16px 0' }}>
          <button className="tab active">All</button>
          <button className="tab">Mentions</button>
          <button className="tab">Invites</button>
        </div>

        <div className="notifications-list" style={{ padding: '0' }}>
          <div className="notification-card unread">
            <span className="unread-dot">●</span>
            <div className="content">
              <strong>Sam Lee sent you a message</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>"hey, ready for the demo?"</p>
            </div>
          </div>

          <div className="notification-card">
            <span className="read-dot">○</span>
            <div className="content">
              <strong>Group invite: Study Squad</strong>
              <div className="invite-actions">
                <button className="btn-accept">Accept</button>
                <button className="btn-decline">Decline</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="live-delivery-notice" style={{ margin: '24px 0 0 0' }}>
          <h3>Live Delivery</h3>
          <p>New notifications appear here the moment they are sent — no manual refresh required.</p>
        </div>
      </main>
    </div>
  );
};

export default NotificationsCenter;