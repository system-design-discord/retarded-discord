import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import EmptyState from './EmptyState';

// Scroll container plus the three states a message list actually has: loading,
// empty, and populated. Keeping them here is what stops each surface from
// inventing its own spinner that never resolves.

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
}) {
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.sender?.id === currentUserId}
          canEdit={canEdit(message)}
          canDelete={canDelete(message)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      <div ref={bottom} />
    </div>
  );
}
