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
  const newest = useRef(null); // the last message id we have seen
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const last = messages.length ? messages[messages.length - 1].id : null;
    const grew = last !== newest.current;
    newest.current = last;

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

    // Follow the conversation only when it actually gained a message. Keying
    // this on the array's identity instead would scroll on every poll, which
    // yanks a deep-linked reader back to the newest row a few seconds after
    // they arrived. It is also the fallback for a hit `fetchAllPages` did not
    // load — there is no row to jump to, so the bottom is the right answer.
    if (grew) {
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
