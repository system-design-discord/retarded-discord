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

## Status

Skeleton. `R-01` adds the `Role` model and its migration; `R-04` adds
`services.has_permission(user, channel, permission)`. Both depend on `C-01`
landing `Channel` and `ChannelMember` in `channels_app` first.
