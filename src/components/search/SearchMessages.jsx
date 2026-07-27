import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchMessages = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // API logic to fetch search results across messages
    setHasSearched(true);
    setResults([]); // Resetting for now to show empty state dynamically
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
          <li className="active" onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      <main className="group-chat-area" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1>Message Search</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Search the text of sent messages across DMs, groups, and channels.</p>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..." 
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} 
          />
          <button type="submit" style={{ padding: '12px 24px' }}>Search</button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Results ({results.length})</h3>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: '16px' }}>Filter: All chats</span>
        </div>

        <div style={{ overflowY: 'auto' }}>
          {results.length > 0 ? (
            results.map(result => (
              <div key={result.id} className="search-result">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{result.chatName}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{result.timestamp}</span>
                </div>
                <strong>{result.author}:</strong> "{result.preview}"
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '32px' }}>
              {hasSearched ? 'No results found for your query.' : 'Type a keyword and press search.'}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchMessages;