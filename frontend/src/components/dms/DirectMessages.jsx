import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { listDirectMessages } from '../../services/messages';
import { unwrapList } from '../../lib/pagination';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import Chat from '../chat/Chat';
import { Avatar, EmptyState } from '../chat/primitives';

// US-2.1 and US-2.5 in the UI.
//
// This screen used to call `dms/` and `dms/<id>/messages/` with `{content}`.
// None of that exists and none of it will: a direct message is read at
// `messages/?user_id=<id>` and written at `messages/` with `{recipient, text}`.
//
// **There is no conversations endpoint**, so the list on the left is derived:
// `messages/` with no selector returns everything `Message.objects.visible_to`
// allows, and the direct messages are the subset carrying a `recipient`. That
// is a real limitation, not a stand-in — it reads every visible message to
// build the sidebar. A `conversations/` endpoint is the fix, and it belongs to
// whoever picks it up, not to this card.

/** Group direct messages into one row per correspondent, newest first. */
function conversationsFrom(messages, meId) {
  const byPartner = new Map();

  for (const message of messages) {
    // `sender` is nested and `recipient` is a bare id — that asymmetry is the
    // serializer's, and it is why a partner's username is sometimes unknown.
    const partnerId = message.sender?.id === meId ? message.recipient : message.sender?.id;
    if (!partnerId || partnerId === meId) continue;

    const known = byPartner.get(partnerId);
    const username = message.sender?.id === partnerId ? message.sender.username : known?.username;

    if (!known || new Date(message.created_at) >= new Date(known.at)) {
      byPartner.set(partnerId, {
        id: partnerId,
        username: username ?? known?.username ?? null,
        preview: message.text ?? '',
        at: message.created_at,
      });
    } else if (username && !known.username) {
      byPartner.set(partnerId, { ...known, username });
    }
  }

  return [...byPartner.values()].sort((a, b) => new Date(b.at) - new Date(a.at));
}

/** Fill in the usernames the message payload could not supply. */
async function nameMissingPartners(conversations) {
  const unnamed = conversations.filter((conversation) => !conversation.username);
  if (unnamed.length === 0) return conversations;

  const names = new Map();
  await Promise.all(
    unnamed.map(async ({ id }) => {
      try {
        const { data } = await api.get(`profile/${id}/`);
        names.set(id, data.user?.username ?? `User ${id}`);
      } catch {
        names.set(id, `User ${id}`);
      }
    }),
  );

  return conversations.map((conversation) =>
    conversation.username ? conversation : { ...conversation, username: names.get(conversation.id) },
  );
}

export default function DirectMessages() {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [lookup, setLookup] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);

  // `?user=<id>` is what SearchMessages links a direct-message hit to, so the
  // deep link and the sidebar selection are the same piece of state.
  const activeId = Number(searchParams.get('user')) || null;

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const messages = await listDirectMessages();
      setConversations(await nameMissingPartners(conversationsFrom(messages, user.id)));
      setError('');
    } catch {
      setError('Your conversations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Land on the most recent conversation when no one is named in the URL.
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setSearchParams({ user: String(conversations[0].id) }, { replace: true });
    }
  }, [activeId, conversations, setSearchParams]);

  const active = useMemo(() => {
    const known = conversations.find((conversation) => conversation.id === activeId);
    if (known) return known;
    const candidate = candidates.find((person) => person.id === activeId);
    return activeId ? { id: activeId, username: candidate?.username ?? `User ${activeId}` } : null;
  }, [conversations, candidates, activeId]);

  const search = async (event) => {
    event.preventDefault();
    const term = lookup.trim();
    if (!term) return;

    setSearching(true);
    try {
      setCandidates(unwrapList(await api.get('users/', { params: { search: term } })));
    } catch {
      setCandidates([]);
      setError('The user search could not be completed.');
    } finally {
      setSearching(false);
    }
  };

  const open = (id) => {
    setSearchParams({ user: String(id) });
    setCandidates([]);
    setLookup('');
  };

  return (
    <div className="min-h-screen h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/dms" />

      {/* Below md the list and the conversation take turns: three panes in
          390px leaves the composer 70px, which is not a layout. */}
      <aside
        className={`w-full md:w-72 shrink-0 bg-slate-900/60 border-r border-slate-800/80 p-3 md:p-4 flex-col gap-4 overflow-y-auto ${
          active ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div>
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-3">
            Direct Messages
          </h3>

          <form onSubmit={search} className="flex gap-2">
            <input
              type="text"
              value={lookup}
              placeholder="Find someone…"
              onChange={(event) => setLookup(event.target.value)}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={searching || !lookup.trim()}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold cursor-pointer"
            >
              {searching ? '…' : 'Go'}
            </button>
          </form>
        </div>

        {candidates.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-600 px-1">Start a conversation</div>
            {candidates.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => open(person.id)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/60 flex items-center gap-3 cursor-pointer"
              >
                <Avatar name={person.username} size="sm" />
                <span className="text-sm truncate">{person.username}</span>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px]">
            {error}
          </div>
        )}

        <div className="space-y-1">
          {loading ? (
            <div className="text-xs text-slate-500 p-2">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="text-xs text-slate-500 p-2">
              No conversations yet. Find someone above to start one.
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => open(conversation.id)}
                className={`w-full text-left p-3 rounded-xl transition cursor-pointer flex items-center gap-3 ${
                  conversation.id === activeId
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                    : 'hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                <Avatar name={conversation.username} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{conversation.username}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{conversation.preview}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {active ? (
        <Chat
          key={active.id}
          kind="dm"
          id={active.id}
          title={active.username}
          subtitle="Direct message"
          headerExtra={
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="md:hidden text-xs text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
            >
              ← All
            </button>
          }
          placeholder={`Message ${active.username}…`}
          emptyTitle="No messages yet"
          emptyHint={`Say something to ${active.username}.`}
        />
      ) : (
        <div className="flex-1 bg-slate-900 hidden md:flex items-center justify-center">
          <EmptyState
            title="Select a conversation"
            hint="Pick someone on the left, or search for a user to start a new conversation."
          />
        </div>
      )}
    </div>
  );
}
