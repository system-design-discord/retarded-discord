import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMessages } from '../../services/messages';
import NavSidebar from '../layout/NavSidebar';

// A hit's `conversation.kind` is one of the three targets a message can have,
// and each one now has a URL that opens the conversation itself. F-05 gave the
// topic case a real destination: `/channels/<id>?topic=<id>` is the channel
// view with that topic selected, which is why the active topic lives in a query
// parameter there rather than in component state.
const openAt = ({ kind, id, channel_id }) => {
  if (kind === 'group') return `/chat/${id}`;
  if (kind === 'topic') return `/channels/${channel_id}?topic=${id}`;
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
      // Every page, not just the first: the label below counts what is in
      // `results`, so keeping one page would report 50 of 60 matches (#103).
      setResults(await searchMessages(searchQuery));
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
      <NavSidebar active="/search" />

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
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
                <div className="text-sm text-slate-200 break-words">
                  <strong>{result.sender.username}:</strong> {result.text}
                  {result.is_edited && <span className="text-[11px] text-slate-500 ml-2">(edited)</span>}
                </div>
              </button>
            ))}
          </div>

          {!hasSearched && !isSearching && (
            <div className="text-center text-slate-500 text-sm py-12 border border-slate-800/50 rounded-2xl bg-slate-900/20">
              Search your messages. Direct messages, groups and channel topics you are part of are
              all searched; nothing else is.
            </div>
          )}

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
