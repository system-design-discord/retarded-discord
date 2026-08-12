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
| `is_group_member(user, group)` | The group-shaped equivalent |
| `require_channel_membership` / `require_group_membership` | The same two, but raising |
| `has_group_permission(user, group, permission)` | A group has no role table, only an admin |
| `require_group_permission(user, group, permission)` | The same, but raises |
| `may_delete_message(user, message)` | `R-05` — the message's context picks which rule above applies |
| `require_delete_message(user, message)` | The same, but raises |
| `may_edit_message(user, message)` | `M-06` — the author, and nobody else, in any context |
| `require_edit_message(user, message)` | The same, but raises |

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
needs instead of writing an `if`, and `common/mixins.py` carries the
`ChannelScopedMixin` that resolves the channel in the URL — both are shared with
`channels_app`, which puts a channel id in four more paths:

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

The channel itself, its topics and its membership are `channels_app`'s —
`backend/channels_app/README.md`. Its `urls.py` is included first and its
patterns do not overlap the four above; a test pins that.

**US-8.2 is a real check, not decoration.** *"…assign various capabilities that
fall within my own permissions…"* — so a super-admin cannot create a role
granting more than they hold, and cannot assign one either. The channel owner
is exempt, because they hold all eight already.

**Deleting a role does not orphan its members.** `ChannelMember.role` is
`SET_NULL`: the holder stays in the channel holding nothing.

## Deleting a message

A message has no permissions of its own — its **target** decides which of the
rules above applies, which is the whole of `may_delete_message`. It lives here so
that `messaging/views.py` contains no `if` about authorship or ownership at all;
`MessageDetailView.perform_destroy` is one call into this module.

| Context | Who may delete | Stories |
|---|---|---|
| Any | the author, always | US-3.3 |
| Group | the group admin | US-3.5, US-5.3 |
| Channel topic | the channel owner, or a role granting `can_delete_message` | US-3.4, US-3.6, US-4.6 |
| Direct message | only the author — never the recipient | US-3.3 |

A message the caller cannot *see* returns **404**, not 403: refusing with 403
would confirm that a conversation they are not in exists. Visibility is
`messaging.Message.objects.visible_to`, which is membership, not permission.

## Editing a message

The mirror image, and worth stating next to the table above so the asymmetry is
not read as an oversight. Every row that may **delete** somebody else's message
may not **edit** it:

| Context | Who may edit | Stories |
|---|---|---|
| Any | the author, and nobody else at all | US-3.1, US-3.2 |

US-3.2 is unusually exact — *"I want only and exclusively myself to be able to
edit my own sent message, so that no one can distort my message"* — so a channel
owner, a group admin and a holder of `can_delete_message` all get 403 from
`may_edit_message`. That the rule is one line is not a reason to move the
decision back into `messaging`.

Assigning a role publishes `common.events.ROLE_CHANGED`. Notifications and the
real-time gateway subscribe to it; this module does not import them.

## Status

`R-01`, `R-04`, `R-02`, `R-03`, `R-05` and `M-06`'s decision are done, and `channels_app` was
built on top of them without adding a single inline owner check. **`messaging/`
no longer decides anything for itself**, which was the last violation of
architecture.tex §5.1 in the codebase. `F-06` — the role management UI — is the
one card left in this chain; it reads `me/permissions/` to decide which controls
to show, and `INT-2`'s matrix deliberately bypasses that UI to prove the server
refuses regardless.

Tests live in `roles/tests/`. `test_permissions.py` carries the sixteen-check
permission matrix that `INT-2` also runs by hand against the API;
`messaging/tests/test_delete_message.py` carries the `R-05` matrix.
