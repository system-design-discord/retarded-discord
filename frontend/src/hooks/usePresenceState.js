import { useCallback, useMemo, useState } from 'react';

/**
 * The state behind `PresenceContext`, and the three socket callbacks that
 * drive it.
 *
 * Called by `NotificationsProvider`, which owns the one connection both
 * concerns ride on — `context/PresenceContext.jsx` says why they share it. It
 * lives here rather than in that file so the context exports nothing but the
 * context.
 */
export default function usePresenceState() {
  const [online, setOnline] = useState(() => new Set());
  const [profileVersion, setProfileVersion] = useState(0);
  const [changedUserId, setChangedUserId] = useState(null);
  const [structure, setStructure] = useState(EMPTY_STRUCTURE);

  /** The whole set, as the server knew it when this socket connected. */
  const receiveSnapshot = useCallback((ids) => {
    setOnline(new Set(ids.map(Number)));
  }, []);

  /** One person crossed the boundary. */
  const receivePresence = useCallback((userId, isOnline) => {
    setOnline((current) => {
      const id = Number(userId);
      if (current.has(id) === isOnline) return current;
      const next = new Set(current);
      if (isOnline) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Somebody's profile changed. Both are set: the counter is what hooks watch,
   *  the id is for the one caller that needs to know whether it was itself. */
  const receiveProfile = useCallback((userId) => {
    setChangedUserId(Number(userId));
    setProfileVersion((current) => current + 1);
  }, []);

  /**
   * A channel, group or topic changed somewhere.
   *
   * The same counter-not-a-patch decision `profileVersion` made, and for a
   * stronger reason: a rename could be applied to a cached row, but a deletion,
   * a new topic and a membership change cannot — the client would have to know
   * what the server's list now *is*, which is exactly the request it is trying
   * to avoid. So the frame is a signal to re-read, not a value to store.
   *
   * `last` rides beside the counter because two callers need more than "read
   * again": `useChannel` and `useGroup` hold *one* object and must not re-read
   * on somebody else's channel changing, and `ChannelView` has to leave the
   * screen when the channel it is showing is the one that went. The counter is
   * bumped on the same tick so a caller can depend on either.
   */
  const receiveStructure = useCallback((frame) => {
    setStructure((current) => ({
      version: current.version + 1,
      scope: frame.scope,
      action: frame.action,
      id: Number(frame.id),
      channelId: frame.channel_id == null ? null : Number(frame.channel_id),
      userId: frame.user_id == null ? null : Number(frame.user_id),
    }));
  }, []);

  /** A dropped socket is not evidence that everybody left. The set is cleared
   *  only on sign-out, where it is genuinely unknown. */
  const clear = useCallback(() => {
    setOnline(new Set());
    setStructure(EMPTY_STRUCTURE);
  }, []);

  const value = useMemo(
    () => ({ online, profileVersion, changedUserId, structure }),
    [online, profileVersion, changedUserId, structure],
  );

  return {
    value,
    receiveSnapshot,
    receivePresence,
    receiveProfile,
    receiveStructure,
    clear,
  };
}

/** Frozen so the "nothing has happened yet" object is one identity, and a hook
 *  depending on it does not re-run on a re-render that changed nothing. */
const EMPTY_STRUCTURE = Object.freeze({
  version: 0,
  scope: null,
  action: null,
  id: null,
  channelId: null,
  userId: null,
});
