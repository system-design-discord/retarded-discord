import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import EmptyState from './EmptyState';

// Scroll container plus the three states a message list actually has: loading,
// empty, and populated. Keeping them here is what stops each surface from
// inventing its own spinner that never resolves.
//
// It also owns the scroll position, which is why the search deep link (#129)
// ends here rather than in the three shells: one implementation, or F-00 has
// been undone.

// Long enough to see where the jump landed, short enough that the ring is not
// still on screen by the time the next message arrives.
const HIGHLIGHT_MS = 2500;

export default function MessageList({
  messages,
  loading,
  currentUserId,
  canEdit = () => false,
  canDelete = () => false,
  onEdit,
  onDelete,
  emptyTitle = 'No messages yet',
  emptyHint,
  highlightMessageId,
}) {
  const bottom = useRef(null);
  const nodes = useRef(new Map()); // message id -> its rendered row
  const jumped = useRef(null); // the id we have already jumped to
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const target = highlightMessageId ? nodes.current.get(highlightMessageId) : null;

    // Jump once per id, not once per render: `useConversation` polls and hands
    // back a fresh array every 5s (30s while the socket is up), so an effect
    // that re-fires on `messages` would pin the view to the hit forever.
    if (target && jumped.current !== highlightMessageId) {
      jumped.current = highlightMessageId;
      setFaded(false);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => setFaded(true), HIGHLIGHT_MS);
      return () => clearTimeout(timer);
    }

    // Only own the scroll position when we are not honouring a deep link.
    // A hit older than what `fetchAllPages` loaded has no row to scroll to, so
    // this is also the fallback: the bottom, exactly as before #129.
    if (!highlightMessageId || jumped.current === highlightMessageId) {
      bottom.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightMessageId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
        Loading messages…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyState title={emptyTitle} hint={emptyHint} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-4">
      {messages.map((message) => (
        // The wrapper carries the ref and the ring so `MessageBubble` — a
        // primitive four screens share — stays ignorant of search entirely.
        <div
          key={message.id}
          ref={(node) => {
            if (node) nodes.current.set(message.id, node);
            else nodes.current.delete(message.id);
          }}
          className={
            message.id === highlightMessageId && !faded
              ? 'rounded-xl ring-2 ring-indigo-500/60 transition duration-500'
              : 'rounded-xl transition duration-500'
          }
        >
          <MessageBubble
            message={message}
            isOwn={message.sender?.id === currentUserId}
            canEdit={canEdit(message)}
            canDelete={canDelete(message)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
      <div ref={bottom} />
    </div>
  );
}
