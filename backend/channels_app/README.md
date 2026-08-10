# channels_app — partly built

Two of this module's three entities exist: **`Channel`** and
**`ChannelMember`**. They landed under card `R-01`, not `C-01`, because
`roles.Role.channel` is a ForeignKey and the roles chain — nine cards across
four people — could not start until there was a channel to point at.

**`C-01` is still open.** It owns:

- the **`Topic`** entity (`ERD.tex` §Topic, and `Message` needs a `topic` FK
  for `C-03`/US-2.3)
- the sweep of this package against `ERD.tex`

`C-02`, `C-03` and `C-04` own the API. There are deliberately no views,
serializers or URL patterns here yet — `urls.py` is still an empty
`urlpatterns`. The only endpoints touching a channel today are the four in
`roles/urls.py`, which are mounted at `/api/channels/<id>/roles/…` and
`/api/channels/<id>/me/permissions/`.

## One recorded deviation from the ERD

`ERD.tex` gives `ChannelMember` a composite `(user_id, channel_id)` primary
key. We use a surrogate `id` plus a `UniqueConstraint` on the same two columns.
It enforces the identical rule and keeps `Role.members` and DRF's generic views
straightforward. Recorded in `../../execution-plan.md` as deviation 5, because
brief Rule 12 grades product-versus-design alignment and `INT-3` checks it.
