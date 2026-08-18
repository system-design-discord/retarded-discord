import { useContext } from 'react';
import PresenceContext from '../context/PresenceContext';

/**
 * Read the presence state.
 *
 * `isOnline(userId)` is the whole of the API most callers want; `online` is the
 * raw `Set` for the rare caller that wants to count. `profileVersion` is the
 * number that changes whenever *anybody's* profile does — a hook that holds
 * copies of user data puts it in its effect dependencies and re-reads.
 *
 * Safe outside the provider (it answers "nobody is online" rather than
 * throwing), because `PresenceProvider` mounts inside `NotificationsProvider`
 * and a screen rendered by a test or a story may have neither.
 */
export default function usePresence() {
  const context = useContext(PresenceContext);

  const online = context?.online ?? EMPTY;

  return {
    online,
    profileVersion: context?.profileVersion ?? 0,
    changedUserId: context?.changedUserId ?? null,
    /**
     * The last structural change, and a `version` that increments with each.
     *
     * A list hook depends on `structure.version` alone and re-reads on any
     * change — cheap, and it cannot miss one. A hook holding a single channel
     * or group reads `scope`/`id` too, so it stays quiet while somebody else's
     * channel is being renamed.
     */
    structure: context?.structure ?? EMPTY_STRUCTURE,
    isOnline: (userId) => userId != null && online.has(Number(userId)),
  };
}

const EMPTY = new Set();

const EMPTY_STRUCTURE = Object.freeze({
  version: 0,
  scope: null,
  action: null,
  id: null,
  channelId: null,
  userId: null,
});
