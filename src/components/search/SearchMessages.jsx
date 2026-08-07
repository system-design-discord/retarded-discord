import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SearchMessages = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    try {
      const response = await api.get(`messages/search/?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.data);
    } catch (error) {
      console.error("Error searching messages:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>🏠</span> Home</button>
        <button onClick={() => navigate('/dms')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>💬</span> Direct Messages</button>
        <button onClick={() => navigate('/groups')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>👥</span> Groups</button>
        <button onClick={() => navigate('/channels')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>📢</span> Channels</button>
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium cursor-pointer"><span>🔍</span> Search</button>
        <button onClick={() => navigate('/notifications')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>🔔</span> Notifications</button>
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>👤</span> Profile</button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold text-white">Message Search</h1>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type keywords..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none"
          />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold cursor-pointer">Search</button>
        </form>

        <div className="space-y-3">
          {results.map(result => (
            <div key={result.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-indigo-400">{result.chatName}</span>
              <div className="text-sm text-slate-200"><strong>{result.author}:</strong> "{result.preview}"</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default SearchMessages;