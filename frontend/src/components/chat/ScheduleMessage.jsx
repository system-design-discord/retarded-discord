import { useState } from 'react';
import useScheduledMessages, { pendingFor } from '../../hooks/useScheduledMessages';
import { localInputValue } from '../../services/scheduling';
import { Timestamp } from './primitives';

// U-12 — US-B2.1. Write a message now, have it sent later, see what is pending
// and cancel one.
//
// Opened from the composer's clock button, so it is reachable from a direct
// message, a group and a channel topic without any of the three knowing it
// exists — `Chat.jsx` passes the target it already holds.
//
// It owns `useScheduledMessages` itself rather than taking the list as a prop,
// so nothing is fetched until somebody opens it. The list is global (the
// endpoint is), and `pendingFor` narrows it to this conversation.

/**
 * The notice, kept in one constant so `SC-03` is a single deletion.
 *
 * Everything on this screen works: the message is stored, listed and
 * cancellable, and the API refuses a past time. What does not exist is the
 * dispatcher — no `backend/scheduling/tasks.py`, no beat schedule — so nothing
 * ever flips `is_delivered` and the message is never sent. Two Celery
 * containers are running, which is exactly why this has to be said out loud:
 * they read as a working feature to anybody checking quickly.
 */
const NOT_DELIVERED_YET =
  'Nothing sends these yet. The message is stored and you can cancel it, but the dispatcher ' +
  'that would deliver it (SC-03) is unwritten — so a scheduled message stays on this list until ' +
  'you cancel it, and it is not visible in the conversation meanwhile.';

/** Fifteen minutes out. Far enough clear of the server's "strictly future"
 *  boundary that a browser clock a minute or two fast still produces a valid
 *  time, and near enough to be useful at a demo. */
function defaultWhen() {
  return localInputValue(new Date(Date.now() + 15 * 60 * 1000));
}

/** What a row is addressed at, in words. The scheduled list carries bare ids
 *  and resolving a topic's name would need the channel list and its topics, so
 *  the "elsewhere" rows say the kind rather than inventing a title. */
const KINDS = { dm: 'a direct message', group: 'a group', topic: 'a channel topic' };

export default function ScheduleMessage({ target, title, draft = '', onSettled }) {
  const { scheduled, loading, error, setError, schedule, cancel } = useScheduledMessages();

  const [text, setText] = useState(draft);
  const [when, setWhen] = useState(defaultWhen);
  const [submitting, setSubmitting] = useState(false);
  const [showElsewhere, setShowElsewhere] = useState(false);

  const here = pendingFor(scheduled, target);
  const elsewhere = scheduled.filter((message) => !here.includes(message));

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const created = await schedule(target, { text, localTime: when });
    setSubmitting(false);

    if (created) {
      setText('');
      // Told to the composer so it can clear its own draft — the same "clear
      // only once the server accepted it" rule the send path follows.
      onSettled?.(created);
    }
  };

  const drop = async (message) => {
    if (!window.confirm('Cancel this scheduled message? It cannot be restored.')) return;
    await cancel(message.id);
  };

  const row = (message, label) => {
    const overdue = new Date(message.scheduled_at) <= new Date();

    return (
      <li
        key={message.id}
        className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-200 truncate">{message.text || '(no text)'}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            {label && <span>{label} ·</span>}
            <Timestamp value={message.scheduled_at} />
            {overdue && (
              <span
                className="text-amber-400"
                title="Its time has passed and it is still pending — see the notice above."
              >
                overdue
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => drop(message)}
          className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer shrink-0"
        >
          Cancel
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white">Schedule a message</h2>
            {title && <p className="text-xs text-slate-500 truncate mt-0.5">to {title}</p>}
          </div>
          <button
            type="button"
            onClick={() => onSettled?.(null)}
            className="text-slate-500 hover:text-slate-300 transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200 mb-4">
          {NOT_DELIVERED_YET}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400" htmlFor="schedule-text">
              Message
            </label>
            <textarea
              id="schedule-text"
              rows={3}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What should it say?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400" htmlFor="schedule-when">
              Send at
            </label>
            <input
              id="schedule-when"
              type="datetime-local"
              value={when}
              min={localInputValue(new Date())}
              onChange={(event) => setWhen(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
            <p className="text-[11px] text-slate-600">
              Your local time. The server refuses anything not strictly in the future.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200 whitespace-pre-line">
              {error}
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-3 text-xs underline cursor-pointer"
              >
                dismiss
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onSettled?.(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || !text.trim() || !when}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            Pending in this conversation
          </h3>

          {loading ? (
            <div className="text-xs text-slate-600">Loading…</div>
          ) : here.length > 0 ? (
            <ul className="space-y-2">{here.map((message) => row(message))}</ul>
          ) : (
            <div className="text-xs text-slate-600">Nothing scheduled here yet.</div>
          )}

          {elsewhere.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowElsewhere((open) => !open)}
                className="text-xs text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showElsewhere ? '▾' : '▸'} {elsewhere.length} scheduled elsewhere
              </button>
              {showElsewhere && (
                <ul className="space-y-2 mt-2">
                  {elsewhere.map((message) => {
                    const to = message.recipient != null
                      ? 'dm'
                      : message.group != null
                        ? 'group'
                        : 'topic';
                    return row(message, KINDS[to]);
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
