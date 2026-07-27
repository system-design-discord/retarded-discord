import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChannelsDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      {/* Global Navigation */}
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/dashboard')}>Home</li>
          <li onClick={() => navigate('/dms')}>Direct Messages</li>
          <li onClick={() => navigate('/groups')}>Groups</li>
          <li className="active" onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      {/* Channels Sidebar */}
      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>Course Server</h3>
        <ul className="group-list">
          <li># general</li>
          <li className="active"># backend</li>
          <li># frontend <span style={{ float: 'right' }}>●</span></li>
        </ul>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '16px 0' }}>● media sharing restricted by admin</p>
        <button style={{ width: '100%' }}>+ Channel</button>
      </aside>

      {/* Channel Chat Area */}
      <main className="group-chat-area">
        <header className="chat-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <h2># backend</h2>
            <div className="topics-row">
              <span className="topic-badge">Releases</span>
              <span className="topic-badge">Bugs</span>
              <span className="topic-badge">Q&A</span>
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Topic: Releases</span>
        </header>
        
        <div className="chat-history">
          <div className="chat-bubble"><strong>Maria:</strong> deploy is green</div>
          <div className="chat-bubble own"><strong>Alex:</strong> shipped it! :tada: <br/> [file] build.log</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 'auto' }}>Files and media can be shared here, subject to admin-defined restrictions.</p>
        </div>

        <form className="chat-compose" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0' }} onSubmit={(e) => e.preventDefault()}>
          <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            Media sharing is RESTRICTED for your role in this channel.
          </div>
          <div style={{ display: 'flex', gap: '12px', padding: '12px 0 0 0' }}>
            <button type="button" disabled style={{ opacity: 0.5 }}>+ Attach</button>
            <input type="text" placeholder="Message #backend..." />
            <button type="submit">Send</button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ChannelsDashboard;