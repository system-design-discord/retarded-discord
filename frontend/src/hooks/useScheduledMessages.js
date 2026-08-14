import { useCallback, useEffect, useState } from 'react';
import {
  cancelScheduledMessage,
  isoFromLocalInput,
  listScheduledMessages,
  scheduleMessage,
} from '../services/scheduling';
import { targetOf } from '../services/messages';
import { readApiError } from '../lib/apiError';

// The caller's pending schedules, and the two writes `U-12` makes against them.
//
// One list for every conversation, because the endpoint is one list:
// `messages/scheduled/` returns everything the caller has pending, and the
// modal narrows it with `pendingFor` rather than asking per conversation. One
// request, and the "N scheduled elsewhere" section comes free.
//
// Same rule as the rest of this layer: **state only ever moves to what the
// server returned.** A schedule the API refused must not appear in the list,
// which for this card is not a nicety — the whole feature is a promise about
// the future, and a row that is only in the browser is a promise nothing kept.

/** The subset of `scheduled` addressed at `target`. Pure; exported for reuse. */
export function pendingFor(scheduled, target) {
  if (!target?.id) return [];
  return scheduled.filter((message) => {
    const to = targetOf(message);
    return to?.kind === target.kind && String(to.id) === String(target.id);
  });
}

export default function useScheduledMessages() {
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setScheduled(await listScheduledMessages());
      setError('');
    } catch (caught) {
      setError(readApiError(caught, 'Your scheduled messages could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * US-B2.1 — schedule one. Returns it, or `null` if it was refused.
   *
   * `localTime` is the `datetime-local` value, refused here **before the
   * request** when it is empty or not in the future. That is the card's first
   * criterion — "refused in the UI as well as by the API" — and the two checks
   * are deliberately both present rather than one delegating to the other: the
   * server's is the one that counts, and the client's is what stops an obvious
   * mistake costing a round trip. When the two disagree, which is what a skewed
   * browser clock produces, the server wins and its message is what is shown.
   */
  const schedule = useCallback(
    async (target, { text, localTime }) => {
      const body = text?.trim();
      if (!body) {
        setError('A scheduled message still needs something to say.');
        return null;
      }

      const scheduledAt = isoFromLocalInput(localTime);
      if (!scheduledAt) {
        setError('Pick a date and time to send this.');
        return null;
      }
      if (new Date(scheduledAt) <= new Date()) {
        setError('That time has already passed. Pick one in the future.');
        return null;
      }

      try {
        const created = await scheduleMessage(target, { text: body, scheduledAt });
        await refresh();
        setError('');
        return created;
      } catch (caught) {
        setError(readApiError(caught, 'The message could not be scheduled.'));
        return null;
      }
    },
    [refresh],
  );

  /** Cancel one before it sends. Returns `true`, or `null` if it was refused. */
  const cancel = useCallback(
    async (messageId) => {
      try {
        await cancelScheduledMessage(messageId);
        await refresh();
        setError('');
        return true;
      } catch (caught) {
        // A 404 here is the common case and it is not really an error: the row
        // is gone, which is what was asked for. Saying so is more useful than
        // "not found".
        setError(
          readApiError(
            caught,
            'That scheduled message is no longer pending — it may already have been cancelled.',
          ),
        );
        return null;
      }
    },
    [refresh],
  );

  return { scheduled, loading, error, setError, refresh, schedule, cancel };
}
