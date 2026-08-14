import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import useConversation from '../../hooks/useConversation';
import { MessageComposer, MessageList } from './primitives';

// The conversation view, and the only one. It takes a target and renders it:
// a direct message, a group, or a channel topic. Nothing in here knows which,
// which is what makes F-05 wiring rather than a third chat implementation.
//
// It used to hold a mock message array and an offline fallback, post
// `{text, group_id}` where the serializer takes `group`, and append the message
// to local state from inside its catch block — so a write that 400'd rendered
// as a sent message (issues #77 and #78). All three are gone.

export default function Chat({
  kind,
  id,
  title,
  subtitle,
  headerExtra,
  aside,
  placeholder,
  emptyTitle = 'No messages yet',
  emptyHint = 'Send the first one.',
  canDelete,
}) {
  const { user } = useContext(AuthContext);
  const { messages, loading, error, live, send, edit, remove } = useConversation(kind, id);

  // US-3.2 — "only and exclusively myself". The server grants nobody else, and
  // hiding the control everywhere else keeps the UI honest about that.
  const isAuthor = (message) => message.sender?.id === user?.id;

  return (
    <div className="flex-1 min-w-0 bg-slate-900 flex">
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="p-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90 backdrop-blur">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-100 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
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
          canEdit={isAuthor}
          canDelete={canDelete ?? isAuthor}
          onEdit={edit}
          onDelete={remove}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
        />

        <MessageComposer onSend={send} disabled={!id} placeholder={placeholder} />
      </main>

      {aside}
    </div>
  );
}
