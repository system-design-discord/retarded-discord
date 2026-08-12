import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// A hit's `conversation.kind` is one of the three targets a message can have.
// The route each one opens is the best the SPA can currently reach: F-03, F-04
// and F-05 are the cards that add per-conversation URLs, and until they land a
// direct message can only be opened at the DM screen rather than at the hit.
const openAt = ({ kind, id, channel_id }) => {
  if (kind === 'group') return `/chat/${id}`;
  if (kind === 'topic') return `/channels?channel=${channel_id}&topic=${id}`;
  return `/dms?user=${id}`;
};

const SearchMessages = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError('');

    try {
      const response = await api.get('messages/search/', { params: { q: searchQuery } });
      // Every list endpoint is paginated, so the body is {count, results}.
      setResults(response.data.results ?? []);
    } catch {
      setError('The search could not be completed. Please try again.');
      setResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer"><span>🏠</span> Home</Link>
        <Link to="/dms" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer"><span>💬</span> Direct Messages</Link>
        <Link to="/groups" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer"><span>👥</span> Groups</Link>
        <Link to="/channels" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer"><span>📢</span> Channels</Link>
        <Link to="/search" className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer"><span>🔍</span> Search</Link>
        <Link to="/notifications" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer"><span>🔔</span> Notifications</Link>
        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer"><span>👤</span> Profile</Link>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Message Search</h1>
            <p className="text-slate-400 text-sm mt-1">
              Across your direct messages, groups and channels — and nothing else.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type keywords..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/60 transition"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition cursor-pointer shrink-0"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {hasSearched && !isSearching && !error && (
            <p className="text-xs text-slate-500">
              {results.length === 0
                ? 'No matches'
                : `${results.length} ${results.length === 1 ? 'match' : 'matches'}`}
            </p>
          )}

          <div className="space-y-3">
            {results.map(result => (
              <button
                key={result.id}
                type="button"
                onClick={() => navigate(openAt(result.conversation))}
                className="w-full text-left p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl space-y-2 transition cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-indigo-400">{result.conversation.name}</span>
                  <span className="text-[11px] text-slate-600 shrink-0">
                    {new Date(result.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-slate-200">
                  <strong>{result.sender.username}:</strong> {result.text}
                  {result.is_edited && <span className="text-[11px] text-slate-500 ml-2">(edited)</span>}
                </div>
              </button>
            ))}
          </div>

          {hasSearched && !isSearching && !error && results.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-12 border border-slate-800/50 rounded-2xl bg-slate-900/20">
              Nothing matched “{searchQuery}”. Only conversations you are part of are searched.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchMessages;
