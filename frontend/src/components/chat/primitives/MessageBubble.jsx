import { useState } from 'react';
import Avatar from './Avatar';
import Timestamp from './Timestamp';
import { fileNameOf, humanSize } from '../../../services/media';

// One attachment, rendered as the kind of thing it is (#123).
//
// `MediaFile.save()` classifies every upload into one of four words — `image`,
// `video`, `audio`, `document` — from its extension, overwriting whatever the
// browser claimed the content type was. So the classification is the server's
// and this only reads it; there is no sniffing here and no second opinion.
//
// It used to be one branch for all four: a paperclip and a filename, so an
// image was indistinguishable from a zip. The wireframes draw an inline
// thumbnail on the direct-message screen, which is the common case by a distance
// — a photo is the thing people actually send.
//
// An image stays clickable through to the file, because the bubble caps it and
// the original is often worth seeing whole.
function Attachment({ media }) {
  const name = fileNameOf(media);
  const size = humanSize(media.file_size);

  if (media.file_type === 'image') {
    return (
      <a href={media.file} target="_blank" rel="noreferrer" className="block mb-2">
        <img
          src={media.file}
          alt={name}
          loading="lazy"
          className="rounded-xl max-h-64 w-auto max-w-full object-contain bg-slate-950/40"
        />
      </a>
    );
  }

  if (media.file_type === 'video') {
    return (
      <video controls preload="metadata" className="block mb-2 rounded-xl max-h-64 max-w-full">
        <source src={media.file} />
        {/* A browser that will not play it still gets a way to the file. */}
        <a href={media.file} target="_blank" rel="noreferrer">
          {name}
        </a>
      </video>
    );
  }

  if (media.file_type === 'audio') {
    return (
      <div className="mb-2">
        <audio controls preload="metadata" className="w-full max-w-xs">
          <source src={media.file} />
        </audio>
        <span className="block text-[11px] opacity-70 mt-0.5 truncate">{name}</span>
      </div>
    );
  }

  // `document`, and anything a future extension lands in. A link is the honest
  // rendering of a zip.
  return (
    <a
      href={media.file}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 mb-2 rounded-xl bg-slate-950/30 px-3 py-2 text-xs underline decoration-dotted opacity-90"
    >
      <span aria-hidden="true">📎</span>
      <span className="min-w-0 truncate">{name}</span>
      {size && <span className="shrink-0 opacity-70">{size}</span>}
    </a>
  );
}

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
              {message.media?.file && <Attachment media={message.media} />}
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
