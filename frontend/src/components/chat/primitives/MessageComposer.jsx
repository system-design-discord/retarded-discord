import { useRef, useState } from 'react';
import { ACCEPT, humanSize, rejectionReason } from '../../../services/media';

// Send and clear — and only clear once the server has accepted the message.
// The old Chat.jsx cleared the input inside its catch block as well, so a
// rejected write looked exactly like a successful one (issue #78).
//
// `onSchedule` (U-12) is optional and adds a clock button beside Send. It takes
// the current draft and resolves truthy when something was actually scheduled,
// which is what lets the same "clear only on success" rule cover both paths —
// a schedule the server refused leaves the draft where the writer can fix it,
// exactly as a refused send does. Without the prop no button is drawn, so a
// surface that has no target to schedule against simply does not offer it.
//
// **Attaching is #123, and it is one control on one composer.** The paperclip
// picks a file, `onSend(text, file)` carries it, and the upload itself happens
// in `useConversation` — see the note there for why it is not done here. The DM
// view, the group view and the channel topic view gained attachments without
// one of them mentioning it, which is the same shape U-12 has and the reason
// F-00 exists.
//
// `canSendMedia` is the channel restriction (A-10). It defaults to true, so DMs
// and groups are unaffected: neither has a channel, so neither has a rule.
// Hiding the picker is a courtesy — `roles.require_send_media` refuses the
// upload and the attach regardless of what this draws.

export default function MessageComposer({
  onSend,
  onSchedule,
  placeholder = 'Write a message…',
  disabled = false,
  canSendMedia = true,
  mediaRestrictionReason = '',
}) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [rejected, setRejected] = useState('');
  const [sending, setSending] = useState(false);
  const picker = useRef(null);

  // A media-only message is legitimate: `Message.text` is nullable and the
  // serializer does not require it, so a photo with no caption is a message.
  const hasSomethingToSend = Boolean(text.trim() || file);

  const clearAttachment = () => {
    setFile(null);
    setRejected('');
    // Resetting the input's value is what makes picking the *same* file twice
    // in a row fire `change` again.
    if (picker.current) picker.current.value = '';
  };

  const pick = (event) => {
    const chosen = event.target.files?.[0] ?? null;
    if (!chosen) return;

    // The server enforces both of these too. Refusing here saves sending ten
    // megabytes that were always going to come back as a 400, and names the
    // file rather than reporting a field error keyed `file`.
    const reason = rejectionReason(chosen);
    if (reason) {
      setRejected(reason);
      setFile(null);
      if (picker.current) picker.current.value = '';
      return;
    }

    setRejected('');
    setFile(chosen);
  };

  const submit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!hasSomethingToSend || sending || disabled) return;

    setSending(true);
    try {
      // Await the caller's answer before clearing anything: an upload that the
      // restriction refused, or a message the server rejected, must leave both
      // the draft and the attachment where the writer can retry them.
      const sent = await onSend(body, file);
      if (sent !== false) {
        setText('');
        clearAttachment();
      }
    } finally {
      setSending(false);
    }
  };

  const openSchedule = async () => {
    if (sending || disabled) return;
    const scheduled = await onSchedule(text.trim());
    if (scheduled) setText('');
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900">
      {(file || rejected || (!canSendMedia && mediaRestrictionReason)) && (
        <div className="px-4 pt-3 text-xs">
          {file && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300">
              <span aria-hidden="true">📎</span>
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="text-slate-600 shrink-0">{humanSize(file.size)}</span>
              <button
                type="button"
                onClick={clearAttachment}
                className="ml-auto shrink-0 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                aria-label="Remove the attachment"
              >
                ✕
              </button>
            </div>
          )}
          {rejected && <p className="mt-2 text-rose-300">{rejected}</p>}
          {!canSendMedia && mediaRestrictionReason && (
            <p className="mt-2 text-slate-500">{mediaRestrictionReason}</p>
          )}
        </div>
      )}

      <form onSubmit={submit} className="p-4 flex gap-3">
        {canSendMedia && (
          <>
            <input
              type="file"
              ref={picker}
              accept={ACCEPT}
              onChange={pick}
              className="hidden"
              // Named so the label-free button below still reads as a control.
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => picker.current?.click()}
              disabled={disabled || sending}
              title="Attach a file"
              aria-label="Attach a file"
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 sm:px-4 py-3 rounded-xl transition cursor-pointer shrink-0"
            >
              📎
            </button>
          </>
        )}

        <input
          type="text"
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setText(event.target.value)}
          className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
        />
        {onSchedule && (
          <button
            type="button"
            onClick={openSchedule}
            // A scheduled message carries text and nothing else through this
            // path — `ScheduleMessage` is given a draft string. Leaving the
            // button live with a file picked would drop the attachment
            // silently, which is #78's failure wearing a different hat.
            disabled={disabled || sending || Boolean(file)}
            title={
              file
                ? 'A scheduled message cannot carry an attachment. Remove it to schedule this.'
                : 'Schedule for later'
            }
            aria-label="Schedule for later"
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 sm:px-4 py-3 rounded-xl transition cursor-pointer shrink-0"
          >
            🕒
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || sending || !hasSomethingToSend}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 sm:px-6 py-3 rounded-xl transition cursor-pointer shrink-0"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
