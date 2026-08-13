import { useCallback, useEffect, useState } from 'react';
import { myPermissions } from '../services/roles';

// US-8.3 — "receive the roles assigned to me in a channel, so that I can act
// according to the defined permissions."
//
// One read of `channels/<id>/me/permissions/`, which needs membership and
// nothing more. Every screen that wants to know whether to render a control
// asks this rather than reasoning about ownership itself: F-06 uses it to
// decide whether the role manager is usable at all, and F-05 needs
// `can_create_topic` for the same reason.
//
// **This is not the permission check.** The server refuses the request whatever
// this returns — `common/permissions.py` asks `roles.services` on every call.
// Hiding a control the server would refuse is a courtesy to the user; treating
// a hidden control as security is the mistake architecture.tex §5.1 exists to
// prevent, and INT-2's matrix bypasses this hook entirely to prove it.

export default function useChannelPermissions(channelId) {
  const [permissions, setPermissions] = useState(null);
  const [role, setRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!channelId) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await myPermissions(channelId);
      setPermissions(data.permissions);
      setRole(data.role);
      setIsOwner(Boolean(data.is_owner));
      setError('');
    } catch (caught) {
      // 403 here means "not a member of this channel", which is a legitimate
      // answer rather than a failure — the screen renders it as one.
      setPermissions(null);
      setError(
        caught?.response?.status === 403
          ? 'You are not a member of this channel.'
          : 'Your permissions for this channel could not be read.',
      );
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Whether the caller holds one named permission. False while loading. */
  const can = useCallback((permission) => Boolean(permissions?.[permission]), [permissions]);

  return { permissions, role, isOwner, loading, error, can, refresh };
}
