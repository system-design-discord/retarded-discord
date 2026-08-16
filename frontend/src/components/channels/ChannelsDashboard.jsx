import { useContext, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import useChannels from '../../hooks/useChannels';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import { EmptyState, useConfirm } from '../chat/primitives';
import CreateChannelModal from './CreateChannelModal';

// F-04 — US-4.1. The channels a user belongs to, and the way into each one.
//
// This file used to be a three-pane chat of its own: its own copy of the
// navigation, its own message list, `response.data` read as an array, and
// `POST channels/<id>/topics/<id>/messages/` with `{content}` — a path that
// does not exist and never will. It was the last component in the SPA calling
// a phantom endpoint and the last one reading a paginated body as an array
// (issue #77). None of that is patched here; the conversation moved to
// `ChannelView.jsx`, which renders through the same `Chat` as the direct
// message and group views, and this screen is the list.
//
// **"Only channels you belong to" is the API's answer, not this screen's.**
// `ChannelListCreateView.get_queryset` filters to `Q(owner=user) |
// Q(memberships__user=user)`; filtering again here would be a second, weaker
// copy of a rule that already has a test.

export default function ChannelsDashboard() {
  const { user } = useContext(AuthContext);
  const { channels, loading, error, setError, create, remove } = useChannels();
  const [creating, setCreating] = useState(false);
  const [deleted, setDeleted] = useState(null);
  const [searchParams] = useSearchParams();
  // Above the `stale` redirect below, which returns early — a hook after it
  // would run on some renders and not others.
  const [confirm, confirmDialog] = useConfirm();

  // `?channel=<id>&topic=<id>` is the URL SearchMessages emitted for a channel
  // hit before this screen existed — a route that could never open anything.
  // The link is fixed at its source; this keeps an old one landing.
  const stale = searchParams.get('channel');
  if (stale) {
    const topic = searchParams.get('topic');
    return <Navigate to={`/channels/${stale}${topic ? `?topic=${topic}` : ''}`} replace />;
  }

  // The owner is the one person guaranteed to hold `can_delete_channel` — it is
  // implicit and cannot be revoked by editing a role — and the list response
  // already names them, so the control costs no per-channel permission read.
  // A role holder who also holds it sees no button here and deletes from the
  // channel view instead; hiding a control is a courtesy, and the server
  // refuses either way.
  const owns = (channel) => channel.owner?.id === user?.id;

  const confirmDelete = async (channel) => {
    // #139 — the same cascade sentence, in the app's own dialog rather than the
    // browser's. `window.confirm` blocked the main thread, which on this screen
    // meant every frame the gateway pushed while it was up was queued instead
    // of rendered.
    const confirmed = await confirm({
      title: `Delete #${channel.name}?`,
      body:
        'Its topics, memberships, roles and every message in them go with it. ' +
        'This cannot be undone.',
      confirmLabel: 'Delete channel',
    });
    if (!confirmed) return;
    const report = await remove(channel.id);
    if (report) setDeleted({ name: channel.name, ...report });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/channels" />

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-white">Your channels</h1>
              <p className="text-slate-400 text-sm mt-1">
                Only channels you own or belong to are listed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              + New channel
            </button>
          </header>

          {error && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200 whitespace-pre-line">
              {error}
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-3 text-xs underline cursor-pointer"
              >
                dismiss
              </button>
            </div>
          )}

          {/* C-03 — a cascade is not silent. The delete answers 200 with what
              went with it precisely so this can be said out loud. */}
          {deleted && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
              <strong className="text-slate-300"># {deleted.name}</strong> deleted — {deleted.topics}{' '}
              topic{deleted.topics === 1 ? '' : 's'}, {deleted.members} member
              {deleted.members === 1 ? '' : 's'}, {deleted.roles} role
              {deleted.roles === 1 ? '' : 's'} and {deleted.messages} message
              {deleted.messages === 1 ? '' : 's'} went with it.
              <button
                type="button"
                onClick={() => setDeleted(null)}
                className="ml-3 underline cursor-pointer"
              >
                dismiss
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : channels.length === 0 ? (
            <EmptyState
              icon="📢"
              title="You are not in any channel yet"
              hint="Create one above — you become its admin, and its topics and roles are yours to set up."
            />
          ) : (
            <ul className="space-y-3">
              {channels.map((channel) => (
                <li
                  key={channel.id}
                  className="bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl transition"
                >
                  <div className="flex items-start justify-between gap-4 p-5 pb-3">
                    <Link to={`/channels/${channel.id}`} className="min-w-0 group">
                      <h2 className="text-base font-bold text-slate-200 group-hover:text-indigo-400 transition truncate">
                        # {channel.name}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {channel.description || 'No description.'}
                      </p>
                    </Link>

                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full">
                        {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                      </span>
                      {owns(channel) && (
                        <button
                          type="button"
                          onClick={() => confirmDelete(channel)}
                          className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* The topics come nested on the channel itself, so this
                      costs no extra request — and it is what makes "opening
                      one navigates to its topics" visible before the click. */}
                  <Link
                    to={`/channels/${channel.id}`}
                    className="flex flex-wrap gap-1.5 px-5 pb-5 pt-0"
                  >
                    {channel.topics?.length > 0 ? (
                      channel.topics.map((topic) => (
                        <span
                          key={topic.id}
                          className="text-[11px] px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400"
                        >
                          #{topic.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-600">No topics yet.</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {creating && <CreateChannelModal onClose={() => setCreating(false)} onCreate={create} />}
      {confirmDialog}
    </div>
  );
}
