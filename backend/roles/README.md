# roles — the authorization authority

**No module decides permissions for itself** (`architecture.tex` §5.1).

Messaging, Channels, Groups and Media do not check ownership inline. They ask
this module:

```python
from roles.services import has_permission

if not has_permission(request.user, channel, 'can_delete_message'):
    raise PermissionDenied
```

That is what makes brief §5.8 — access levels manageable without editing code —
literally true: a permission is a **row in a table**, evaluated at runtime, not
a constant in a source file.

If you find yourself writing `if user.id == channel.owner_id` anywhere outside
this package, stop and call in here instead.

## The eight permissions

Fixed by `user_stories_en.tex` §Assumptions. They are booleans on `Role`:

| Permission | Grants |
|---|---|
| `can_send_media` | Attach media to a message |
| `can_delete_message` | Delete another member's message |
| `can_create_topic` | Create a topic in the channel |
| `can_edit_channel` | Edit name, description, image |
| `can_remove_member` | Remove a member |
| `can_add_member` | Add a member directly (SH.1) |
| `can_change_role` | Create, edit and assign roles |
| `can_delete_channel` | Delete the channel |

The channel owner implicitly holds all eight.

## The service

`roles/services.py` is the only place any of this is decided.

| Call | Answers |
|---|---|
| `has_permission(user, channel, permission)` | Does this user hold it here? |
| `require_permission(user, channel, permission)` | The same, but raises `PermissionDenied` |
| `permissions_for(user, channel)` | All eight at once, as `{name: bool}` |
| `is_channel_member(user, channel)` | Membership, which reading needs but no permission covers |
| `has_group_permission(user, group, permission)` | The group-shaped equivalent — a group has no role table, only an admin |
| `require_group_permission(user, group, permission)` | The same, but raises |

Every answer is read from database rows at call time. Nothing is cached, so an
admin reassigning a role takes effect on the caller's **very next request** —
no restart, no deploy. That is what brief §5.8 is asking for.

The rules, in the order they are applied:

1. An anonymous caller holds nothing.
2. The **channel owner holds all eight**, always. Ownership is not a row that
   can be revoked by editing a role.
3. A member holds exactly what their assigned role grants.
4. A member with **no role**, and a **non-member**, hold nothing.
5. An unknown permission name raises `ValueError` rather than quietly
   returning `False` — a typo should not look like a denial.

`common/permissions.py` wraps the service for DRF, so a view declares what it
needs instead of writing an `if`:

```python
class ChannelDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated, HasChannelPermission]
    required_permission = 'can_delete_channel'

    def get_channel(self):
        return get_object_or_404(Channel, pk=self.kwargs['channel_id'])
```

## The API

All four are mounted under `/api/` and gated by `can_change_role`, except the
last, which needs only membership.

| Method | Path | Does |
|---|---|---|
| `GET` `POST` | `/api/channels/<channel_id>/roles/` | List or create a role (US-8.1) |
| `GET` `PATCH` `DELETE` | `/api/channels/<channel_id>/roles/<id>/` | Read, rename, re-grant or delete one (US-4.2) |
| `GET` `PUT` `PATCH` | `/api/channels/<channel_id>/members/<user_id>/role/` | Assign or clear a member's role (US-4.9) |
| `GET` | `/api/channels/<channel_id>/me/permissions/` | What the caller may do here (US-8.3) |

**US-8.2 is a real check, not decoration.** *"…assign various capabilities that
fall within my own permissions…"* — so a super-admin cannot create a role
granting more than they hold, and cannot assign one either. The channel owner
is exempt, because they hold all eight already.

**Deleting a role does not orphan its members.** `ChannelMember.role` is
`SET_NULL`: the holder stays in the channel holding nothing.

Assigning a role publishes `common.events.ROLE_CHANGED`. Notifications and the
real-time gateway subscribe to it; this module does not import them.

## Status

`R-01`, `R-04`, `R-02` and `R-03` are done. `R-05` — message deletion by a
channel admin, a group admin, or a holder of `can_delete_message` — still calls
in here rather than re-implementing the check, and `F-06` reads
`me/permissions/` to decide which controls to show.

Tests live in `roles/tests/`. `test_permissions.py` carries the sixteen-check
permission matrix that `INT-2` also runs by hand against the API.
