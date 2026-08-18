import { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useConversation from '../../hooks/useConversation';
import ScheduleMessage from './ScheduleMessage';
import { Avatar, MessageComposer, MessageList } from './primitives';

// The conversation view, and the only one. It takes a target and renders it:
// a direct message, a group, or a channel topic. Nothing in here knows which,
// which is what makes F-05 wiring rather than a third chat implementation.
//
// It used to hold a mock message array and an offline fallback, post
// `{text, group_id}` where the serializer takes `group`, and append the message
// to local state from inside its catch block — so a write that 400'd rendered
// as a sent message (issues #77 and #78). All three are gone.
//
// **Scheduling (U-12) is threaded through here rather than added to three
// screens.** The composer raises `onSchedule`, this opens `ScheduleMessage`
// with the target it already holds, and the direct-message, group and topic
// views get it without one of them mentioning it. That is the rule in
// `README.md`: if a fourth conversation kind appears and somebody writes a
// second scheduler, F-00 has been undone — add a prop instead.

export default function Chat({
  kind,
  id,
  title,
  // The conversation's own picture, when it has one. A group and a channel both
  // carry an `avatar` and neither was ever drawn outside its settings screen —
  // this header said `title` in text for all three kinds, so a group you had
  // given a picture to looked exactly like one you had not. Optional because a
  // direct message has no picture of its *own*: the person has one, and
  // `DirectMessages` already draws it in the rail.
  //
  // No `online` prop is passed with it, deliberately. `Avatar` draws the
  // presence dot only when told to, and a room is never online.
  avatar,
  subtitle,
  headerExtra,
  aside,
  placeholder,
  emptyTitle = 'No messages yet',
  emptyHint = 'Send the first one.',
  canDelete,
  // Threaded straight through to `MessageList`, which owns the scroll (#129).
  // `Chat` deliberately learns nothing about where the id came from — the
  // three shells read their own URL and all three arrive here the same way.
  highlightMessageId,
  // A-10's per-channel media restriction, threaded the same way (#123). Only
  // `ChannelView` ever passes it, because only a channel has one: a DM and a
  // group have no `media_restricted` column and no `can_send_media` to consult,
  // so the default is what keeps them unaffected rather than a branch here.
  // This is not the check — `roles.require_send_media` refuses the upload and
  // the attach whatever the composer draws.
  canSendMedia = true,
  mediaRestrictionReason = '',
  // A-7 — told when a message actually went out. `DirectMessages` is the only
  // shell that needs it, because it derives its own conversation list on the
  // client and a brand-new thread is not in that list until something re-reads
  // it. The other two shells navigate to a group or a topic that already
  // exists, so they pass nothing and behave exactly as before.
  onSent,
}) {
  const { user } = useContext(AuthContext);
  const {
    messages,
    loading,
    error,
    live,
    send: sendMessage,
    edit,
    remove,
  } = useConversation(kind, id);

  const send = async (text, file = null) => {
    const sent = await sendMessage(text, file);
    if (sent) onSent?.();
    return sent;
  };

  const [scheduling, setScheduling] = useState(false);
  const [draft, setDraft] = useState('');

  // The composer awaits `onSchedule` and clears its input only if the answer is
  // truthy, which is the same rule it applies to a send. The modal outlives
  // that answer, though — it stays open after a successful schedule so the row
  // it just created appears in the pending list — so the promise is parked here
  // and settled from whichever happens first: something was scheduled, or the
  // modal was closed having scheduled nothing.
  const settle = useRef(null);

  const requestSchedule = (text) =>
    new Promise((resolve) => {
      settle.current = resolve;
      setDraft(text);
      setScheduling(true);
    });

  const scheduled = (created) => {
    settle.current?.(Boolean(created));
    settle.current = null;
  };

  const closeSchedule = () => {
    // Resolves `false` only if nothing was scheduled; once `scheduled` has run,
    // `settle.current` is null and the composer has already cleared its draft.
    settle.current?.(false);
    settle.current = null;
    setScheduling(false);
  };

  // An unmount with the modal open would leave the composer awaiting a promise
  // that can never settle, and its button disabled for as long as it lived.
  useEffect(
    () => () => {
      settle.current?.(false);
      settle.current = null;
    },
    [],
  );

  // US-3.2 — "only and exclusively myself". The server grants nobody else, and
  // hiding the control everywhere else keeps the UI honest about that.
  const isAuthor = (message) => message.sender?.id === user?.id;

  return (
    <div className="flex-1 min-w-0 bg-slate-900 flex">
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="p-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90 backdrop-blur">
          <div className="min-w-0 flex items-center gap-3">
            {avatar !== undefined && (
              <Avatar name={title} src={avatar} alt={title ? `${title}` : 'conversation'} size="md" />
            )}
            <div className="min-w-0">
              <h2 className="font-bold text-slate-100 truncate">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* F-07's only visible surface. The distinction is worth showing
                because it changes what "the other person has not replied" means:
                connected, a message appears the instant it is written; falling
                back, it can be up to half a minute behind. Both work. */}
            <span
              className="flex items-center gap-1.5 text-[11px] text-slate-500"
              title={
                live
                  ? 'Connected — new messages arrive as they are sent.'
                  : 'Not connected — refreshing every few seconds instead.'
              }
            >
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-slate-600'}`}
              />
              {live ? 'Live' : 'Polling'}
            </span>
            {headerExtra}
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <MessageList
          messages={messages}
          loading={loading}
          currentUserId={user?.id}
          highlightMessageId={highlightMessageId}
          canEdit={isAuthor}
          canDelete={canDelete ?? isAuthor}
          onEdit={edit}
          onDelete={remove}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
        />

        <MessageComposer
          onSend={send}
          onSchedule={id ? requestSchedule : undefined}
          disabled={!id}
          placeholder={placeholder}
          canSendMedia={canSendMedia}
          mediaRestrictionReason={mediaRestrictionReason}
        />
      </main>

      {aside}

      {scheduling && (
        <ScheduleMessage
          target={{ kind, id }}
          title={title}
          draft={draft}
          onScheduled={scheduled}
          onClose={closeSchedule}
        />
      )}
    </div>
  );
}
