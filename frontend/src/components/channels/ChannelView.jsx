import { useContext, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useChannel from '../../hooks/useChannel';
import useChannelPermissions from '../../hooks/useChannelPermissions';
import { CAN_CREATE_TOPIC, CAN_EDIT_CHANNEL, CAN_SEND_MEDIA } from '../../lib/permissions';
import { listMembers } from '../../services/roles';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import Chat from '../chat/Chat';
import { Avatar, EmptyState, useConfirm } from '../chat/primitives';

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
  const { channel, topics, loading, error, setError, addTopic, renameTopic, removeTopic } =
    useChannel(channelId);
  // US-8.3, and the only read of `me/permissions/` on this screen. The hook is
  // shared with F-06's role manager rather than this file asking a second time.
  const { isOwner, can } = useChannelPermissions(channelId);
  const [searchParams, setSearchParams] = useSearchParams();

  const [members, setMembers] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [adding, setAdding] = useState(false);

  // #126 — renaming happens in place on the active tab rather than in a modal,
  // the shape `RoleManager`'s `RoleCard` already uses for the same job.
  const [renaming, setRenaming] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [topicBusy, setTopicBusy] = useState(false);
  // What the last delete took with it, kept so the count `C-03` answers with is
  // actually read to somebody. Cleared on the next topic switch.
  const [cascade, setCascade] = useState(null);

  const [confirm, confirmDialog] = useConfirm();

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

  // Switching topics closes an open rename and drops the previous topic's
  // deletion report — both belong to the tab that is no longer active.
  useEffect(() => {
    setRenaming(false);
    setTopicName(active?.name ?? '');
    setCascade(null);
  }, [active?.id, active?.name]);

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

  // A-10 / US-2.4 / US-7.3, and the same composition `roles.may_send_media`
  // makes: an unrestricted channel lets every member attach a file, exactly like
  // posting text, and a restricted one narrows that to holders of
  // `can_send_media`. The owner holds all eight implicitly, which is why
  // `isOwner` short-circuits here as it does there.
  //
  // Composing it here rather than reading `media_restricted` inside the composer
  // is the point of #123's second criterion: until now the toggle governed an
  // action nobody could perform, so nothing observed it. The server refuses the
  // upload and the attach regardless — this only stops offering a control that
  // was always going to 403.
  // #125 — the settings screen's gate, asked here only to decide whether to
  // offer the link to it.
  const mayEditChannel = can(CAN_EDIT_CHANNEL);

  // #126 — `TopicDetailView.required_permission` is `can_edit_channel` for both
  // verbs, so one gate covers rename and delete. Until this landed,
  // `useChannel.removeTopic` and `services/channels.deleteTopic` were written,
  // exported and called by nothing: the permission's two topic-facing effects
  // were unreachable, which is the same lopsidedness #125 fixed for the channel
  // itself. As everywhere else, hiding the controls is a courtesy — the server
  // refuses the PATCH and the DELETE regardless.
  const mayEditTopics = mayEditChannel;

  const restricted = Boolean(channel?.media_restricted);
  const maySendMedia = !restricted || isOwner || can(CAN_SEND_MEDIA);
  const mediaRestrictionReason = maySendMedia
    ? ''
    : 'Media is restricted in this channel, and your role here does not grant can_send_media. You can still send text.';

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

  const submitRename = async (event) => {
    event.preventDefault();
    const name = topicName.trim();
    if (!name || !active) return;

    if (name === active.name) {
      setRenaming(false);
      return;
    }

    setTopicBusy(true);
    const renamed = await renameTopic(active.id, name);
    setTopicBusy(false);
    // A refused rename — a name already taken in this channel, a permission the
    // caller does not hold — keeps the form open with what they typed, so the
    // message below is next to the thing it is about.
    if (renamed) setRenaming(false);
  };

  const destroyTopic = async () => {
    if (!active) return;

    const confirmed = await confirm({
      title: `Delete #${active.name}?`,
      body: 'Every message in this topic goes with it, for everybody and not only for you. This cannot be undone.',
      confirmLabel: 'Delete topic',
    });
    if (!confirmed) return;

    setTopicBusy(true);
    const deletedMessages = await removeTopic(active.id);
    setTopicBusy(false);

    // `C-03` answers 200 with `{deleted_messages: n}` precisely so a caller can
    // say what went with it. `null` is a refusal, and `0` is a real answer —
    // hence the explicit test rather than a truthiness check.
    if (deletedMessages !== null) {
      setCascade({ name: active.name, messages: deletedMessages });
      // The landing effect picks the next topic; clearing the parameter is what
      // lets it, since the deleted id would otherwise stay in the URL.
      setSearchParams({}, { replace: true });
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

          <div className="shrink-0 flex items-center gap-2">
            {/* F-06's screen. It was reachable only through a picker that existed
                because this view did not; now it is linked from its subject. */}
            <Link
              to={`/channels/${channelId}/roles`}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition"
            >
              🛡️ Roles
            </Link>
            {/* #125. Offered to holders of `can_edit_channel` only — the screen
                itself refuses everybody else and the server refuses them twice,
                but a settings link that leads to a refusal is worse than none. */}
            {mayEditChannel && (
              <Link
                to={`/channels/${channelId}/settings`}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition"
              >
                ⚙ Settings
              </Link>
            )}
          </div>
        </header>

        <nav className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2 overflow-x-auto">
          {renaming && active ? (
            // The rename replaces the tab strip rather than sitting beside it:
            // at 390px there is no room for both, and the strip is a scroll
            // container that would otherwise carry the form off screen.
            <form onSubmit={submitRename} className="flex items-center gap-2 w-full">
              <span className="text-xs text-slate-500 shrink-0">Rename</span>
              <input
                autoFocus
                value={topicName}
                onChange={(event) => setTopicName(event.target.value)}
                className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={topicBusy || !topicName.trim()}
                className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 cursor-pointer"
              >
                {topicBusy ? '…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopicName(active.name);
                  setRenaming(false);
                }}
                className="shrink-0 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
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

              {/* Offered for the *active* topic only. Per-tab menus would put
                  two controls on every tab in a strip that already scrolls
                  sideways on a phone, and the active topic is the one whose
                  messages are on screen to be weighed against deleting it. */}
              {mayEditTopics && active && (
                <span className="shrink-0 flex items-center gap-2 pl-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTopicName(active.name);
                      setRenaming(true);
                    }}
                    disabled={topicBusy}
                    title={`Rename #${active.name}`}
                    className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={destroyTopic}
                    disabled={topicBusy}
                    title={`Delete #${active.name}`}
                    className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-40 cursor-pointer"
                  >
                    Delete
                  </button>
                </span>
              )}
            </>
          )}

          {mayCreateTopic && !renaming && (
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

        {cascade && (
          <div className="mx-4 mt-3 rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-xs text-slate-300">
            #{cascade.name} was deleted, and {cascade.messages}{' '}
            {cascade.messages === 1 ? 'message went' : 'messages went'} with it.
            <button
              type="button"
              onClick={() => setCascade(null)}
              className="ml-3 underline cursor-pointer"
            >
              dismiss
            </button>
          </div>
        )}

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
            canSendMedia={maySendMedia}
            mediaRestrictionReason={mediaRestrictionReason}
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

      {confirmDialog}
    </div>
  );
}
