import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChannels } from '../../services/channels';
import NavSidebar from '../layout/NavSidebar';
import { EmptyState } from '../chat/primitives';

// Which channel's roles do you want to manage?
//
// F-06 is a per-channel screen and the channels dashboard that would normally
// link to it is F-04, which has not landed. Rather than edit a file another
// card is about to rewrite, this surface reaches its own subject: the role
// manager is a route, and this is the way in.

export default function ChannelPicker() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listChannels()
      .then((rows) => {
        setChannels(rows);
        setError('');
      })
      .catch(() => setError('Your channels could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/channels" />

      <main className="flex-1 min-w-0 p-4 md:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold">Roles and permissions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Pick a channel to manage its roles. Only channels you belong to are listed.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : channels.length === 0 ? (
          <EmptyState
            icon="📢"
            title="You are not in any channel yet"
            hint="Create or join one, and its roles will be managed here."
          />
        ) : (
          <ul className="space-y-2 max-w-2xl">
            {channels.map((channel) => (
              <li key={channel.id}>
                <Link
                  to={`/channels/${channel.id}/roles`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 hover:border-indigo-600 transition"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold truncate"># {channel.name}</span>
                    {channel.description && (
                      <span className="block text-xs text-slate-500 truncate">{channel.description}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
