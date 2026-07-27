import React from 'react';
import { useNavigate } from 'react-router-dom';

const DirectMessages = () => {
  const navigate = useNavigate();

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      {/* Global Navigation */}
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/dashboard')}>Home</li>
          <li className="active" onClick={() => navigate('/dms')}>Direct Messages</li>
          <li onClick={() => navigate('/groups')}>Groups</li>
          <li onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      {/* DM Sidebar */}
      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>Conversations</h3>
        <input type="text" placeholder="Search DMs" style={{ width: '90%', marginBottom: '16px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
        <ul className="group-list">
          <li className="active"><strong>Sam Lee</strong> <br/><span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>● Online</span></li>
          <li><strong>Maria Chen</strong> <br/><span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>"thanks!"</span></li>
          <li><strong>Lee J.</strong> <br/><span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>"sounds good"</span></li>
        </ul>
      </aside>

      {/* DM Chat Area */}
      <main className="group-chat-area">
        <header className="chat-header">
          <div>
            <h2 style={{ display: 'inline-block', marginRight: '12px' }}>Sam Lee</h2>
            <span style={{ fontSize: '12px', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '12px' }}>Online</span>
          </div>
        </header>
        
        <div className="chat-history">
          <div className="chat-bubble"><strong>Sam:</strong> hey, ready for the demo?</div>
          <div className="chat-bubble own"><strong>Alex:</strong> yes - pushing now</div>
          <div className="chat-bubble own" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>[image attachment] build_preview.png (edited)</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 'auto' }}>Hover a bubble to reveal Edit / Delete (own messages only).</p>
        </div>

        <form className="chat-compose" onSubmit={(e) => e.preventDefault()}>
          <button type="button">+ Attach</button>
          <button type="button">Schedule</button>
          <input type="text" placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </main>
    </div>
  );
};

export default DirectMessages;