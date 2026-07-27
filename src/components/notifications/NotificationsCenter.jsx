import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NotificationsCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]); // Empty by default

  const handleMarkAllRead = () => {
    // API logic to mark all as read
  };

  const handleInviteAction = (id, action) => {
    // API logic to accept/decline group invite
  };

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
          <li className="active" onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      <main className="settings-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <header className="notifications-header" style={{ padding: '0 0 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', borderBottom: 'none' }}>
          <div>
            <h1>Notifications</h1>
            <p style={{ color: 'var(--text-secondary)' }}>New activity across your chats, groups, and channels.</p>
          </div>
          <button type="button" onClick={handleMarkAllRead}>Mark all read</button>
        </header>

        <div className="notifications-tabs" style={{ background: 'transparent', padding: '0 0 16px 0' }}>
          <button className={`tab ${activeTab === 'All' ? 'active' : ''}`} onClick={() => setActiveTab('All')}>All</button>
          <button className={`tab ${activeTab === 'Mentions' ? 'active' : ''}`} onClick={() => setActiveTab('Mentions')}>Mentions</button>
          <button className={`tab ${activeTab === 'Invites' ? 'active' : ''}`} onClick={() => setActiveTab('Invites')}>Invites</button>
        </div>

        <div className="notifications-list" style={{ padding: '0' }}>
          {notifications.length > 0 ? (
            notifications.map(notif => (
              <div key={notif.id} className={`notification-card ${!notif.isRead ? 'unread' : ''}`}>
                <span className={notif.isRead ? 'read-dot' : 'unread-dot'}>{notif.isRead ? '○' : '●'}</span>
                <div className="content">
                  <strong>{notif.title}</strong>
                  {notif.type === 'invite' ? (
                    <div className="invite-actions">
                      <button className="btn-accept" onClick={() => handleInviteAction(notif.id, 'accept')}>Accept</button>
                      <button className="btn-decline" onClick={() => handleInviteAction(notif.id, 'decline')}>Decline</button>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>"{notif.body}"</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '32px' }}>No notifications to display.</p>
          )}
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