// src/components/notifications/NotificationsCenter.jsx

import React from 'react';

const NotificationsCenter = () => {
  return (
    <div className="notifications-container">
      {/* Mapped to Messaging Wireframe - Notifications */}
      <header className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>New activity across your chats, groups, and channels.</p>
        </div>
        <button className="btn-mark-read">Mark all read</button>
      </header>

      <div className="notifications-tabs">
        <button className="tab active">All</button>
        <button className="tab">Mentions</button>
        <button className="tab">Invites</button>
      </div>

      <div className="notifications-list">
        {/* Unread Message Notification */}
        <div className="notification-card unread">
          <span className="unread-dot">●</span>
          <div className="content">
            <strong>Sam Lee sent you a message</strong>
            <p>"hey, ready for the demo?"</p>
          </div>
          <span className="time">1m</span>
        </div>

        {/* Unread Group Add Notification */}
        <div className="notification-card unread">
          <span className="unread-dot">●</span>
          <div className="content">
            <strong>You were added to Project Team</strong>
            <p>by Maria Chen</p>
          </div>
          <span className="time">10m</span>
        </div>

        {/* Read Mention Notification */}
        <div className="notification-card read">
          <span className="read-dot">○</span>
          <div className="content">
            <strong>@maria_chen mentioned you in #backend</strong>
            <p>"...as alex_morgan suggested earlier"</p>
          </div>
          <span className="time">1h</span>
        </div>

        {/* Group Invite Notification with Actions */}
        <div className="notification-card read invite-card">
          <span className="read-dot">○</span>
          <div className="content">
            <strong>Group invite: Study Squad</strong>
            <div className="invite-actions">
              <button className="btn-accept">Accept</button>
              <button className="btn-decline">Decline</button>
            </div>
          </div>
          <span className="time">2d</span>
        </div>
      </div>

      <div className="live-delivery-notice">
        <h3>Live Delivery</h3>
        <p>New notifications (and the unread badge in the primary nav) appear here the moment they are sent — no manual refresh required.</p>
      </div>
    </div>
  );
};

export default NotificationsCenter;