import { useState } from 'react';
import Avatar from './Avatar';
import Timestamp from './Timestamp';

// The one message bubble in the codebase. F-00 exists so that the direct
// message view, the group view and the channel topic view are the same UI with
// a different fetch — if a second implementation of this ever appears, that
// card has been undone.
//
// It decides nothing. `canEdit` and `canDelete` are told to it, and hiding a
// control is presentation only: the server refuses the same request whether or
// not the button was rendered (roles.services.may_edit_message and
// may_delete_message).

export default function MessageBubble({
  message,
  isOwn,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text ?? '');
  const [busy, setBusy] = useState(false);

  const author = message.sender?.username ?? 'unknown';

  const startEditing = () => {
    setDraft(message.text ?? '');
    setEditing(true);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;

    setBusy(true);
    try {
      await onEdit(message.id, draft.trim());
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete(message.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar name={author} size="sm" />

      <div className={`flex flex-col min-w-0 max-w-[min(32rem,80%)] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-400 truncate">{author}</span>
          <Timestamp value={message.created_at} />
        </div>

        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-md break-words w-full ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none'
          }`}
        >
          {editing ? (
            <form onSubmit={saveEdit} className="flex flex-col gap-2">
              <input
                type="text"
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                className="bg-slate-950/60 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-indigo-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-[11px] px-2 py-1 rounded-lg bg-slate-700 text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="text-[11px] px-2 py-1 rounded-lg bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              {message.media?.file && (
                <a
                  href={message.media.file}
                  target="_blank"
                  rel="noreferrer"
                  className="block mb-2 text-xs underline decoration-dotted opacity-90"
                >
                  📎 {message.media.file.split('/').pop()}
                </a>
              )}
              {message.text}
              {message.is_edited && (
                <span className="ml-2 text-[11px] italic opacity-70">(edited)</span>
              )}
            </>
          )}
        </div>

        {!editing && (canEdit || canDelete) && (
          <div className="flex gap-3 mt-1 text-[11px] text-slate-500">
            {canEdit && (
              <button type="button" onClick={startEditing} className="hover:text-indigo-400 cursor-pointer">
                Edit
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={remove} disabled={busy} className="hover:text-rose-400 cursor-pointer">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
