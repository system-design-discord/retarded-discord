import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useChannel from '../../hooks/useChannel';
import useChannelPermissions from '../../hooks/useChannelPermissions';
import { CAN_EDIT_CHANNEL } from '../../lib/permissions';
import NavSidebar from '../layout/NavSidebar';

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
  const { channel, loading, error, setError, update } = useChannel(channelId);
  const { can, isOwner, loading: loadingPermissions } = useChannelPermissions(channelId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mayEdit = can(CAN_EDIT_CHANNEL);

  // Seed from the server's answer and re-seed whenever it changes — including
  // after a save, so the fields show what was stored rather than what was typed.
  useEffect(() => {
    setName(channel?.name ?? '');
    setDescription(channel?.description ?? '');
  }, [channel]);

  const dirty =
    channel && (name !== (channel.name ?? '') || description !== (channel.description ?? ''));

  const save = async (event) => {
    event.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    setSaved(false);
    const failure = await update({ name: name.trim(), description: description.trim() });
    setSaving(false);
    setSaved(!failure);
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
              Ask the channel admin for a role that grants it.
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

              {/* The avatar is the third field `ChannelSerializer` accepts and
                  the one this screen does not offer. It is a file upload rather
                  than a text field, and #104 is the cautionary tale about
                  wiring one of those halfway; US-4.7 and US-6.1 are satisfied
                  by name and description, so it stays out rather than going in
                  half-built. */}
              <p className="text-xs text-slate-500">
                The channel image is not editable here yet. Name and description are.
              </p>
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
    </div>
  );
}
