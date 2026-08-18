import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useChannel from '../../hooks/useChannel';
import useChannelPermissions from '../../hooks/useChannelPermissions';
import { CAN_EDIT_CHANNEL } from '../../lib/permissions';
import NavSidebar from '../layout/NavSidebar';
import AvatarField from '../common/AvatarField';
import { Avatar, useConfirm } from '../chat/primitives';
import { AuthContext } from '../../context/AuthContext';
import { removeMember as removeChannelMember } from '../../services/roles';
import readApiError from '../../lib/apiError';

// #125 — US-4.7 and US-6.1. The screen `can_edit_channel` was missing.
//
// The permission existed, was enforced by `ChannelDetailView`, was toggleable in
// the role manager and granted, in practice, one boolean: `updateChannel`'s only
// caller sent `{ media_restricted }` and nothing else. A channel's name and
// description could not be changed from the product at all, while `PATCH
// channels/<id>/` had accepted both since `C-02`.
//
// **A route, not a section on the roles screen**, and the reason is the same one
// `U-10` gave for `/groups/<id>/settings`: this is the mirror of that screen,
// and a reader looking for a channel's settings should not have to find them
// filed under Roles. The wireframes draw a *Channel Settings* screen with an
// Overview block and a Permission Defaults block, which is what this is.
//
// **Deleting the channel is deliberately not here.** `ChannelsDashboard` has it,
// with the confirmation dialog and the cascade report `C-03` answers with, and a
// second call site for the same destructive act is how the two drift.
//
// Nothing here decides anything. `can_edit_channel` is asked so a member who
// cannot edit is told rather than invited to fail; the server refuses the PATCH
// whatever this draws, which is what INT-2's matrix checks with the UI bypassed.

export default function ChannelSettings() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { channel, loading, error, setError, gone, update } = useChannel(channelId);
  const { can, isOwner, loading: loadingPermissions } = useChannelPermissions(channelId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // A-3 — the picked file, held here rather than in `AvatarField`, because
  // `dirty` below has to count it.
  const [avatar, setAvatar] = useState(null);
  // The third avatar state — see `AvatarField`. A picked file and a removal
  // cannot travel in one request, so they are two flags rather than one value.
  const [dropAvatar, setDropAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  // Declared with the rest of the state and above the early returns below: a
  // hook after an early return runs on some renders and not others.
  const [confirm, confirmDialog] = useConfirm();

  const mayEdit = can(CAN_EDIT_CHANNEL);

  // Deleted under you, by its owner or by anybody else holding
  // `can_delete_channel`. Nothing on this screen has a subject any more.
  useEffect(() => {
    if (gone) navigate('/channels', { replace: true });
  }, [gone, navigate]);

  // Seed from the server's answer and re-seed whenever it changes — including
  // after a save, so the fields show what was stored rather than what was typed.
  useEffect(() => {
    setName(channel?.name ?? '');
    setDescription(channel?.description ?? '');
    setAvatar(null);
    setDropAvatar(false);
  }, [channel]);

  // A picked file counts toward `dirty`, or the Save button stays disabled with
  // an image sitting in the form — the screen would look like it worked and
  // store nothing, which is #104 exactly.
  const dirty =
    channel &&
    (name !== (channel.name ?? '') ||
      description !== (channel.description ?? '') ||
      Boolean(avatar) ||
      dropAvatar);

  const save = async (event) => {
    event.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    setSaved(false);
    const fields = { name: name.trim(), description: description.trim() };
    // A `File` goes multipart, an explicit `null` stays JSON and clears the
    // column, and neither key at all leaves the stored image alone. They are
    // three cases and not two — see `GroupSettings`, which has the same three.
    const failure = await update(
      avatar ? { ...fields, avatar } : dropAvatar ? { ...fields, avatar: null } : fields,
    );
    setSaving(false);
    setSaved(!failure);
  };

  // A-10's toggle, moved here from the role manager: it is a property of the
  // channel rather than of a role, and it is what the wireframe's Channel
  // Settings screen draws. Same `updateChannel` write as the form above, so a
  // refused PATCH leaves the switch showing what is stored and not what was
  // clicked.
  // A-10 — the other half of SH.2. Leaving used to go through the same gate as
  // removing anybody else, so a member without `can_remove_member` — which is
  // most of them — was refused their own exit. The owner is not offered it:
  // `ERD.tex` makes `Channel : ChannelMember` a `1 : 1..N` relationship and the
  // API answers 400.
  const leave = async () => {
    const confirmed = await confirm({
      title: `Leave ${channel.name}?`,
      body: 'You will stop seeing its topics and their messages. Somebody who can add members can put you back.',
      confirmLabel: 'Leave channel',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await removeChannelMember(channelId, user.id);
      navigate('/channels');
    } catch (caught) {
      setError(readApiError(caught, 'You could not be removed from this channel.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleMediaRestriction = async (next) => {
    setBusy(true);
    setSaved(false);
    await update({ media_restricted: next });
    setBusy(false);
  };

  if (loading || loadingPermissions) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <NavSidebar active="/channels" />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          Loading the channel…
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <NavSidebar active="/channels" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-slate-400 px-6 text-center">
          {error || 'This channel could not be opened.'}
          <Link to="/channels" className="text-indigo-400 hover:text-indigo-300 text-xs">
            Back to channels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/channels" />

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="min-w-0 flex items-start gap-4">
            <Avatar
              name={channel.name}
              src={channel.avatar}
              alt={channel.name}
              size="lg"
              className="mt-3"
            />
            <div className="min-w-0">
              <Link
                to={`/channels/${channelId}`}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition"
              >
                ← Back to the conversation
              </Link>
              <h1 className="text-2xl font-extrabold text-white truncate mt-1"># {channel.name}</h1>
              <p className="text-slate-400 text-sm mt-1 truncate">
                {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                {channel.owner && <> · owned by @{channel.owner.username}</>}
              </p>
            </div>
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

          {!mayEdit && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
              Changing a channel's information needs{' '}
              <code className="text-slate-300">can_edit_channel</code>, which you do not hold here.
              Ask the channel admin for a role that grants it. Leaving the channel is yours either
              way — it is below.
            </div>
          )}

          {/* --------------------------------------------------- overview */}
          {mayEdit && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Channel information
              </h2>

              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-bold uppercase text-slate-400"
                    htmlFor="description"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                {/* A-3 — US-4.7 and US-6.1 name three fields; this is the
                    third, and the one the paragraph that used to sit below this
                    form apologised for. */}
                <AvatarField
                  id="channel-avatar"
                  label="Image"
                  currentUrl={channel.avatar}
                  file={avatar}
                  onPick={(picked) => {
                    setAvatar(picked);
                    if (picked) setDropAvatar(false);
                  }}
                  onRemove={(next) => {
                    setDropAvatar(next);
                    if (next) setAvatar(null);
                  }}
                  removed={dropAvatar}
                  hint="Anyone who can edit the channel can change or remove its image."
                />

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!dirty || saving || !name.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl text-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  {saved && !dirty && <span className="text-xs text-emerald-400">Saved.</span>}
                </div>
              </form>

            </section>
          )}

          {/* ------------------------------------------ permission defaults */}
          {mayEdit && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Permission defaults
              </h2>

              {/* A-10 / US-2.4. Since #123 this governs something observable —
                  the attach control in the topic conversation — where before it
                  restricted an action no user could perform. */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-indigo-500"
                  checked={Boolean(channel.media_restricted)}
                  disabled={busy}
                  onChange={(event) => toggleMediaRestriction(event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-200">
                    Restrict media in this channel
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 break-words">
                    {channel.media_restricted
                      ? 'On — only members whose role grants can_send_media may attach files. You are the owner or hold it yourself, so you are unaffected.'
                      : 'Off — every member of this channel may attach files, the same as text, whether or not their role grants can_send_media.'}
                  </span>
                </span>
              </label>

              {/* The half of the rule the product never said out loud. A
                  channel admin who cleared `can_send_media` on a role and
                  watched the holder keep attaching files had no way to find out
                  from any screen that this switch is what arms it. The roles
                  screen now says the same thing from its own side. */}
              <p className="text-xs text-slate-500">
                <strong className="text-slate-400 font-medium">
                  This switch is what makes a role&apos;s{' '}
                  <code className="text-slate-300">can_send_media</code> mean anything.
                </strong>{' '}
                While it is off the permission is dormant and every member may send media;
                turning it on narrows that to the owner and the roles that grant it. Which
                roles those are is set on{' '}
                <Link
                  to={`/channels/${channelId}/roles`}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  the roles screen
                </Link>
                .
              </p>
            </section>
          )}

          {/* ------------------------------------------------ leaving */}
          {!isOwner && (
            <section className="bg-slate-900 border border-rose-900/50 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase text-rose-400 tracking-wider">
                Leaving this channel
              </h2>
              <p className="text-xs text-slate-400">
                Leaving takes you out and leaves the channel standing. The owner cannot leave —
                somebody has to administer it.
              </p>
              <button
                type="button"
                onClick={leave}
                disabled={busy}
                className="border border-rose-900/60 text-rose-300 hover:bg-rose-950/40 font-semibold px-5 py-2 rounded-xl text-sm transition cursor-pointer disabled:opacity-50"
              >
                Leave this channel
              </button>
            </section>
          )}

          {/* ----------------------------------------------- danger zone */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Deleting this channel
            </h2>
            <p className="text-xs text-slate-400">
              Deleting a channel takes its topics, memberships, roles and every message in them.
              {isOwner
                ? ' It is offered from the channel list, which is where it reports what went with it.'
                : ' It needs can_delete_channel, and it is offered from the channel list.'}
            </p>
            <Link
              to="/channels"
              className="inline-block text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Go to the channel list
            </Link>
          </section>
        </div>
      </main>

      {confirmDialog}
    </div>
  );
}
