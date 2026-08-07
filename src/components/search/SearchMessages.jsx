import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ALL_MOCK_MESSAGES = [
  { id: 1, chatName: 'Direct Message - Arman', author: 'Arman (Backend Lead)', preview: 'API endpoints are ready for integration.', timestamp: '10:30 AM' },
  { id: 2, chatName: 'Direct Message - Arvin', author: 'Arvin (PO)', preview: 'Sprint 2 backlog is prioritized.', timestamp: '11:15 AM' },
  { id: 3, chatName: 'Channel # general-discussion', author: 'Professor', preview: 'Phase 2 project submission deadline is July 28.', timestamp: 'Yesterday' },
  { id: 4, chatName: 'Channel # frontend-help', author: 'Amir (You)', preview: 'React SPA and Tailwind CSS setup completed.', timestamp: 'Today 02:00 PM' }
];

const SearchMessages = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    const query = searchQuery.toLowerCase();
    
    const filtered = ALL_MOCK_MESSAGES.filter(
      msg => msg.preview.toLowerCase().includes(query) || 
             msg.author.toLowerCase().includes(query) ||
             msg.chatName.toLowerCase().includes(query)
    );

    setResults(filtered);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🏠</span> Home
        </button>
        <button onClick={() => navigate('/dms')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>💬</span> Direct Messages
        </button>
        <button onClick={() => navigate('/groups')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👥</span> Groups
        </button>
        <button onClick={() => navigate('/channels')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>📢</span> Channels
        </button>
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>🔍</span> Search
        </button>
        <button onClick={() => navigate('/notifications')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </button>
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </button>
      </aside>

      {/* Main Search Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Message Search</h1>
            <p className="text-slate-400 text-sm mt-1">Search text content across all direct messages, groups, and channels.</p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keywords (e.g. API, Sprint, Amir)..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              Search
            </button>
          </form>

          <div>
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Results ({results.length})</h3>
            <div className="space-y-3">
              {results.length > 0 ? (
                results.map(result => (
                  <div key={result.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-indigo-400">{result.chatName}</span>
                      <span className="text-slate-500">{result.timestamp}</span>
                    </div>
                    <div className="text-sm text-slate-200">
                      <strong className="text-white">{result.author}:</strong> "{result.preview}"
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 text-sm py-12">
                  {hasSearched ? 'No results found for your query.' : 'Type a keyword above to search.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchMessages;