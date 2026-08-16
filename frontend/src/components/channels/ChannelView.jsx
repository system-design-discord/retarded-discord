import { useContext, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useChannel from '../../hooks/useChannel';
import useChannelPermissions from '../../hooks/useChannelPermissions';
import { CAN_CREATE_TOPIC } from '../../lib/permissions';
import { listMembers } from '../../services/roles';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import Chat from '../chat/Chat';
import { Avatar, EmptyState } from '../chat/primitives';

// F-05 — US-2.3 and US-4.5. A channel, its topics, and the conversation in one.
//
// **This is the fourth caller of `Chat`, not a fourth chat.** The message list,
// the bubbles, the edit form and the composer are the same F-00 primitives the
// direct-message and group views render, reached through the same component
// with `kind="topic"`. The only things this file adds are the tab strip, the
// member aside and the link to the role manager. If you are about to write a
// second `MessageBubble` here, F-00 has been undone.
//
// The active topic lives in the URL as `?topic=<id>` — the same `useSearchParams`
// pattern `DirectMessages.jsx` uses for `?user=` — so a topic is linkable, which
// is what lets `SearchMessages` open a channel hit at the message rather than at
// the channel.

export default function ChannelView() {
  const { channelId } = useParams();
  const { user } = useContext(AuthContext);
  const { channel, topics, loading, error, setError, addTopic } = useChannel(channelId);
  // US-8.3, and the only read of `me/permissions/` on this screen. The hook is
  // shared with F-06's role manager rather than this file asking a second time.
  const { isOwner, can } = useChannelPermissions(channelId);
  const [searchParams, setSearchParams] = useSearchParams();

  const [members, setMembers] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [adding, setAdding] = useState(false);

  // Membership is all this needs — `ChannelMemberListCreateView` gates the read
  // on `IsChannelMember`, unlike the roles list, which needs `can_change_role`.
  // Asking for the roles here would earn a 403 a plain member could predict.
  useEffect(() => {
    let cancelled = false;
    listMembers(channelId)
      .then((rows) => {
        if (!cancelled) setMembers(rows);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const requested = Number(searchParams.get('topic')) || null;
  // The message a search hit named (#129). The landing effect below rewrites
  // the params only when the requested topic is gone, and losing the highlight
  // in that case is right — the message is not in the topic being shown.
  const highlight = Number(searchParams.get('message')) || null;
  const active = topics.find((topic) => topic.id === requested) ?? topics[0] ?? null;

  // Land on the first topic when none is named, or when the one named is gone.
  useEffect(() => {
    if (active && active.id !== requested) {
      setSearchParams({ topic: String(active.id) }, { replace: true });
    }
  }, [active, requested, setSearchParams]);

  // US-3.3, US-3.5 and US-3.6, mirroring `roles.services.may_delete_message`:
  // the author, the channel owner, or a holder of `can_delete_message`. Read
  // from `me/permissions/` rather than from the member row, which carries a
  // role *name* and none of the eight booleans. The server decides; this only
  // avoids offering a control it would refuse.
  const mayDeleteAny = isOwner || can('can_delete_message');
  const canDelete = (message) => message.sender?.id === user?.id || mayDeleteAny;

  // US-4.5. **Hiding this control is not the permission check.**
  // `TopicListCreateView` sets `required_permission = 'can_create_topic'` and
  // `HasChannelPermission` asks `roles.services` on every POST, so the refusal
  // stands with this UI bypassed entirely — which is what INT-2's matrix
  // exercises and what the acceptance criterion actually says. Not rendering a
  // button the server would refuse is a courtesy to the user, nothing more.
  const mayCreateTopic = can(CAN_CREATE_TOPIC);

  const submitTopic = async (event) => {
    event.preventDefault();
    const name = newTopic.trim();
    if (!name) return;

    setAdding(true);
    const created = await addTopic(name);
    setAdding(false);
    if (created) {
      setNewTopic('');
      setSearchParams({ topic: String(created.id) });
    }
  };

  // Only a channel that would not *load* replaces the screen. A refused write —
  // a duplicate topic name, a `can_create_topic` the caller does not hold —
  // reports inline below, because throwing the reader back to the channel list
  // would lose both the conversation and the message explaining the refusal.
  if (error && !channel) {
    return (
      <div className="min-h-dvh h-dvh bg-slate-950 text-slate-100 flex">
        <NavSidebar active="/channels" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-slate-400 px-6 text-center">
          {error}
          <Link to="/channels" className="text-indigo-400 hover:text-indigo-300 text-xs">
            Back to channels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh h-dvh bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/channels" />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to="/channels" className="text-[11px] text-slate-500 hover:text-slate-300">
              ← All channels
            </Link>
            <h1 className="font-bold text-slate-100 truncate mt-0.5">
              # {channel?.name ?? (loading ? '…' : channelId)}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {channel?.description || 'No description.'}
              {channel && (
                <>
                  {' · '}
                  {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                </>
              )}
            </p>
          </div>

          {/* F-06's screen. It was reachable only through a picker that existed
              because this view did not; now it is linked from its subject. */}
          <Link
            to={`/channels/${channelId}/roles`}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition"
          >
            🛡️ Roles
          </Link>
        </header>

        <nav className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setSearchParams({ topic: String(topic.id) })}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                active?.id === topic.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              #{topic.name}
            </button>
          ))}
          {!loading && topics.length === 0 && (
            <span className="text-xs text-slate-600">This channel has no topics yet.</span>
          )}

          {mayCreateTopic && (
            <form onSubmit={submitTopic} className="shrink-0 flex items-center gap-1.5 ml-auto">
              <input
                value={newTopic}
                onChange={(event) => setNewTopic(event.target.value)}
                placeholder="New topic…"
                className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={adding || !newTopic.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {adding ? '…' : '+ Add'}
              </button>
            </form>
          )}
        </nav>

        {error && (
          <div className="mx-4 mt-3 rounded-xl bg-rose-950/40 border border-rose-900/60 px-3 py-2 text-xs text-rose-300 whitespace-pre-line">
            {error}
            <button
              type="button"
              onClick={() => setError('')}
              className="ml-3 underline cursor-pointer"
            >
              dismiss
            </button>
          </div>
        )}

        {active ? (
          <Chat
            // Remounting on a topic switch is what makes "switching topics
            // switches the message list" true without a stale frame: the hook
            // keys its state to the target, and a fresh instance cannot show
            // the previous topic's messages while the new ones load.
            key={active.id}
            kind="topic"
            id={active.id}
            highlightMessageId={highlight}
            title={`#${active.name}`}
            subtitle={channel ? `in # ${channel.name}` : null}
            placeholder={`Message #${active.name}…`}
            emptyHint="Be the first to say something in this topic."
            canDelete={canDelete}
            aside={
              <aside className="w-60 shrink-0 border-l border-slate-800 bg-slate-900/60 p-4 overflow-y-auto hidden lg:block">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                  Members
                </h3>
                <div className="space-y-1">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg">
                      <Avatar name={member.user?.username} size="sm" />
                      <span className="text-sm text-slate-300 truncate">
                        {member.user?.username}
                      </span>
                      {member.is_owner ? (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-amber-500">
                          owner
                        </span>
                      ) : (
                        member.role && (
                          <span className="ml-auto text-[10px] uppercase tracking-wide text-indigo-400 truncate">
                            {member.role}
                          </span>
                        )
                      )}
                    </div>
                  ))}
                  {members.length === 0 && (
                    <div className="text-xs text-slate-600">No members listed.</div>
                  )}
                </div>
              </aside>
            }
          />
        ) : (
          <div className="flex-1 bg-slate-900 flex items-center justify-center">
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : (
              <EmptyState
                icon="🗂️"
                title="No topics in this channel yet"
                hint="A channel's messages live in its topics. Create one to start the conversation."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
