import React from 'react';
import { useNavigate } from 'react-router-dom';

const SearchMessages = () => {
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
          <li onClick={() => navigate('/channels')}>Channels</li>
          <li className="active" onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      {/* Search Main Area */}
      <main className="group-chat-area" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1>Message Search</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Search the text of sent messages across DMs, groups, and channels.</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input type="text" defaultValue="deploy" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
          <button type="submit" style={{ padding: '12px 24px' }}>Search</button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Results (12)</h3>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: '16px' }}>Filter: All chats</span>
        </div>

        <div style={{ overflowY: 'auto' }}>
          <div className="search-result">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong># backend</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Today</span>
            </div>
            <strong>Maria Chen:</strong> "deploy is green"
          </div>

          <div className="search-result">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong>Sam Lee</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Yesterday</span>
            </div>
            <strong>Alex Morgan:</strong> "deploy when ready"
          </div>

          <div className="search-result">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong>Project Team</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Jul 20</span>
            </div>
            <strong>Lee J.:</strong> "deploy script is in the repo"
          </div>
        </div>
        
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '16px' }}>Clicking a result jumps directly to that message inside its chat.</p>
      </main>
    </div>
  );
};

export default SearchMessages;