# channels_app — partly built

All three of this module's entities now exist: **`Channel`**, **`ChannelMember`**
and **`Topic`**. None of them landed under `C-01`.

- `Channel` and `ChannelMember` landed under `R-01`, because `roles.Role.channel`
  is a ForeignKey and the roles chain — nine cards across four people — could not
  start until there was a channel to point at.
- `Topic` landed under `R-05`, because a channel message cannot exist without it
  and `R-05`'s channel branch ("the channel owner always succeeds", "a member
  without the permission gets 403") is untestable without a channel message.

**`C-01` is still open and still owns the sweep of this package against
`ERD.tex`.** Both bites are recorded in `../../execution-plan.md` as deviations 5
and 6 rather than absorbed silently, because brief Rule 12 grades exactly this
kind of gap and `INT-3` checks it.

`C-02`, `C-03` and `C-04` own the API. There are deliberately no views,
serializers or URL patterns here yet — `urls.py` is still an empty
`urlpatterns`. In particular **`Topic` has no API and no `can_create_topic`
gate**: creating a topic is `C-03`'s card, and until it lands a topic can only be
made in the shell or the Django admin. The only endpoints touching a channel
today are the four in `roles/urls.py`, mounted at `/api/channels/<id>/roles/…`
and `/api/channels/<id>/me/permissions/`.

## The one recorded deviation from the ERD

`ERD.tex` gives `ChannelMember` a composite `(user_id, channel_id)` primary
key. We use a surrogate `id` plus a `UniqueConstraint` on the same two columns.
It enforces the identical rule and keeps `Role.members` and DRF's generic views
straightforward. `Topic`'s `(channel, name)` uniqueness is expressed the same
way, as is `groups_app.GroupMember`'s `(group, user)`.
