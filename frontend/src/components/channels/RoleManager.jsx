import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useChannelPermissions from '../../hooks/useChannelPermissions';
import useChannelRoles from '../../hooks/useChannelRoles';
import {
  CAN_ADD_MEMBER,
  CAN_EDIT_CHANNEL,
  CAN_REMOVE_MEMBER,
  PERMISSIONS,
  PERMISSION_KEYS,
} from '../../lib/permissions';
import { getChannel, updateChannel } from '../../services/channels';
import { searchUsers } from '../../services/users';
import NavSidebar from '../layout/NavSidebar';
import { Avatar, EmptyState, useConfirm } from '../chat/primitives';

// F-06 — US-4.2, US-8.1, US-8.2, US-8.3.
//
// The screen that demonstrates the whole roles chain: a role is a row in a
// table with eight boolean columns, and changing one takes effect on the
// holder's very next request with no restart. That is brief §5.8, and it is
// only visible if something lets you change it.
//
// **Two things this screen does not do, deliberately.**
//
//   * It does not decide anything. Every control here is refused by the server
//     as well when it should be — `roles.services` is the authority and
//     `common/permissions.py` asks it on every call. Disabling a checkbox is a
//     courtesy so the user is not invited to fail; INT-2's permission matrix
//     runs the same calls with this UI bypassed precisely because a hidden
//     button is not a permission check.
//   * It does not guess. A refused write leaves the list exactly as the server
//     last described it — see the note in `useChannelRoles`.
//
// US-8.2 is why the toggles are gated by what *you* hold: "assign various
// capabilities that fall within my own permissions". `RoleSerializer.validate`
// enforces it and answers 400 per offending field; the messages surface here.
//
// **#142 put membership on this screen**, and it follows `GroupSettings.jsx`
// rather than inventing a second pattern: the same `services/users.js` directory
// picker, the same candidate filtering, the same `useConfirm` before a removal.
// Three permissions now gate three different things here and they are genuinely
// independent — `can_change_role` for the role editor and the role `<select>`,
// `can_add_member` for the picker, `can_remove_member` for the Remove buttons —
// so the screen is no longer all-or-nothing on the first of them.

function PermissionGrid({ role, heldByActor, disabled, onToggle }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3">
      {PERMISSIONS.map(({ key, label, hint }) => {
        // You cannot grant what you do not hold (US-8.2). Revoking is always
        // allowed — taking away less than you have is never an escalation.
        const wouldGrant = !role[key];
        const refused = wouldGrant && !heldByActor[key];

        return (
          <label
            key={key}
            className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${
              refused ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800/60'
            }`}
            title={refused ? `You do not hold ${key}, so you cannot grant it.` : hint}
          >
            <input
              type="checkbox"
              className="mt-1 accent-indigo-500"
              checked={Boolean(role[key])}
              disabled={disabled || refused}
              onChange={(event) => onToggle(key, event.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-slate-200">
                {label}
              </span>
              {/* The API key, shown on purpose: the acceptance criterion is
                  that the eight toggles map one-to-one onto the model
                  booleans, and this is how that is demonstrated. */}
              <code className="block text-[10px] text-slate-600">{key}</code>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function RoleCard({ role, heldByActor, busy, onToggle, onRename, onDelete }) {
  const [name, setName] = useState(role.name);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => setName(role.name), [role.name]);

  const granted = PERMISSION_KEYS.filter((key) => role[key]).length;

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        {renaming ? (
          <form
            className="flex gap-2 min-w-0 flex-1"
            onSubmit={async (event) => {
              event.preventDefault();
              if (name.trim() && name.trim() !== role.name) await onRename(name.trim());
              setRenaming(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
            />
            <button type="submit" className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setName(role.name);
                setRenaming(false);
              }}
              className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="min-w-0">
            <h3 className="font-semibold break-words min-w-0">{role.name}</h3>
            <p className="text-xs text-slate-500">
              {granted} of {PERMISSION_KEYS.length} permissions granted
            </p>
          </div>
        )}

        {!renaming && (
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => setRenaming(true)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Rename
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <PermissionGrid role={role} heldByActor={heldByActor} disabled={busy} onToggle={onToggle} />
    </li>
  );
}

export default function RoleManager() {
  const { channelId } = useParams();

  const {
    permissions,
    role: myRole,
    isOwner,
    loading: loadingPermissions,
    error: permissionError,
    can,
  } = useChannelPermissions(channelId);

  const mayManage = can('can_change_role');

  // Do not fire the roles list at somebody who cannot read it. It needs
  // `can_change_role`, so asking anyway would trade a rendered explanation for
  // a 403 in the console.
  // `enabled` gates the *roles* half only. Members load for anybody who can see
  // the channel, which is what lets a holder of `can_add_member` alone use this
  // screen at all — see the note in `useChannelRoles`.
  const {
    roles,
    members,
    loading,
    error,
    setError,
    create,
    update,
    remove,
    assign,
    addMember,
    removeMember,
  } = useChannelRoles(channelId, { enabled: mayManage });

  const mayAddMember = can(CAN_ADD_MEMBER);
  const mayRemoveMember = can(CAN_REMOVE_MEMBER);

  const [channel, setChannel] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [busy, setBusy] = useState(false);

  // The directory picker, the same shape `GroupSettings.jsx` uses.
  const [term, setTerm] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  const [confirm, confirmDialog] = useConfirm();

  // A-10 — the media restriction is a plain field on the channel, so the
  // existing `updateChannel` is the whole write. No new service function.
  const mayEditChannel = can(CAN_EDIT_CHANNEL);

  const toggleMediaRestriction = (next) =>
    run(async () => {
      try {
        // Move state only to what the server returned, the same rule
        // `useChannelRoles` follows: a refused PATCH must leave the switch
        // showing what is actually stored, not what was clicked.
        const updated = await updateChannel(channelId, { media_restricted: next });
        setChannel(updated);
        setError('');
      } catch (caught) {
        setError(
          caught?.response?.status === 403
            ? 'Changing the media restriction needs can_edit_channel, which you do not hold.'
            : 'The media restriction could not be changed.',
        );
      }
    });

  useEffect(() => {
    getChannel(channelId)
      .then(setChannel)
      .catch(() => setChannel(null));
  }, [channelId]);

  const run = async (work) => {
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  const searchDirectory = async (event) => {
    event.preventDefault();
    if (!term.trim()) return;

    setSearching(true);
    try {
      setCandidates(await searchUsers(term));
      setSearched(true);
    } catch {
      setCandidates([]);
      setSearched(false);
      setError('The user search could not be completed.');
    } finally {
      setSearching(false);
    }
  };

  const add = async (candidate) => {
    setBusyUserId(candidate.id);
    await addMember(candidate.id);
    setBusyUserId(null);
    // Succeeded or refused, the picker's copy of who is in the channel is now
    // stale. Dropping the row is cheaper than reasoning about which it was, and
    // the member list below has already been re-read from the server.
    setCandidates((current) => current.filter((row) => row.id !== candidate.id));
  };

  const kick = async (member) => {
    const confirmed = await confirm({
      title: `Remove ${member.user.username} from # ${channel?.name ?? 'this channel'}?`,
      body: 'They lose access to the channel, its topics and every message in them. Their role here goes with them; their messages stay.',
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;

    setBusyUserId(member.user.id);
    await removeMember(member.user.id);
    setBusyUserId(null);
  };

  // Somebody already in the channel is not a candidate. The API answers 400 for
  // a duplicate, so this is about not offering the mistake rather than about
  // hiding its consequence.
  const memberUserIds = new Set(members.map((member) => member.user.id));
  const addable = candidates.filter((candidate) => !memberUserIds.has(candidate.id));

  const heldByActor = permissions ?? {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/channels" />

      <main className="flex-1 min-w-0 p-4 md:p-8">
        <header className="mb-6">
          <Link
            to={`/channels/${channelId}`}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            ← Back to # {channel?.name ?? channelId}
          </Link>
          <h1 className="text-xl font-bold mt-1">
            Roles in <span className="text-indigo-400"># {channel?.name ?? channelId}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isOwner
              ? 'You own this channel, so you hold all eight permissions implicitly.'
              : myRole
                ? `Your role here is ${myRole}.`
                : 'You hold no role in this channel.'}
          </p>
        </header>

        {(permissionError || error) && (
          <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200 whitespace-pre-line">
            {permissionError || error}
            {error && (
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-3 text-xs underline cursor-pointer"
              >
                dismiss
              </button>
            )}
          </div>
        )}

        {/* A-10 / US-2.4 — the per-channel media restriction. Rendered only for
            holders of can_edit_channel, which is a courtesy and not the check:
            the server refuses the PATCH regardless of what this shows, and the
            acceptance criterion is verified with this UI bypassed. */}
        {mayEditChannel && channel && (
          <section className="max-w-2xl mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
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
                    ? 'On — only members whose role grants can_send_media may send files. You are the owner or hold it yourself, so you are unaffected.'
                    : 'Off — every member of this channel may send files, the same as text.'}
                </span>
              </span>
            </label>
          </section>
        )}

        {loadingPermissions ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-6">
            {/* Not an error, an answer. The server would refuse every *role*
                write, so this says so instead of rendering controls that 403.
                Since #142 it is no longer the whole screen: membership is a
                different permission and the panel below may still be usable. */}
            {!mayManage && (
            <section className="max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-semibold">You cannot manage roles here</h2>
            <p className="text-sm text-slate-400 mt-1">
              Managing roles needs <code className="text-slate-300">can_change_role</code>, which you do
              not hold in this channel. Ask the channel admin for a role that grants it.
            </p>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-6 mb-2">
              What you do hold
            </h3>
            <ul className="text-sm space-y-1">
              {PERMISSIONS.map(({ key, label }) => (
                <li key={key} className="flex items-center gap-2">
                  <span className={heldByActor[key] ? 'text-emerald-400' : 'text-slate-700'}>
                    {heldByActor[key] ? '✓' : '×'}
                  </span>
                  <span className={heldByActor[key] ? 'text-slate-200' : 'text-slate-600'}>{label}</span>
                  <code className="text-[10px] text-slate-600">{key}</code>
                </li>
              ))}
            </ul>
            </section>
            )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {mayManage && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Roles</h2>

              <form
                className="flex gap-2 mb-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = newRoleName.trim();
                  if (!name) return;
                  // A new role grants nothing — every column defaults to False,
                  // so it is safe until somebody deliberately ticks a box.
                  run(async () => {
                    const failed = await create({ name });
                    if (!failed) setNewRoleName('');
                  });
                }}
              >
                <input
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                  placeholder="New role name — Moderator, Greeter, …"
                  className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="submit"
                  disabled={busy || !newRoleName.trim()}
                  className="shrink-0 bg-indigo-600 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Create
                </button>
              </form>

              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : roles.length === 0 ? (
                <EmptyState
                  icon="🛡️"
                  title="No roles in this channel yet"
                  hint="Create one above, then tick the permissions it should grant."
                />
              ) : (
                <ul className="space-y-3">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      heldByActor={heldByActor}
                      busy={busy}
                      onToggle={(key, value) => run(() => update(role.id, { [key]: value }))}
                      onRename={(name) => run(() => update(role.id, { name }))}
                      onDelete={() => run(() => remove(role.id))}
                    />
                  ))}
                </ul>
              )}
            </section>
            )}

            <section className="space-y-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Members</h2>

                {loading ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : members.length === 0 ? (
                  <EmptyState icon="👥" title="This channel has no members" />
                ) : (
                  <ul className="space-y-2">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
                      >
                        <Avatar name={member.user.username} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">{member.user.username}</span>
                          {member.is_owner && (
                            <span className="block text-[10px] uppercase tracking-wider text-amber-500">
                              Owner · holds all eight
                            </span>
                          )}
                        </span>

                        {/* The role `<select>` is `can_change_role`'s, and it is
                            the one control here that needs the roles list to
                            have loaded. Without that permission there are no
                            roles to choose from, so there is nothing to draw. */}
                        {mayManage && (
                          <select
                            value={member.role_id ?? ''}
                            disabled={busy || member.is_owner}
                            title={
                              member.is_owner
                                ? 'The channel owner holds every permission implicitly; a role would add nothing.'
                                : undefined
                            }
                            onChange={(event) =>
                              run(() => assign(member.user.id, event.target.value ? Number(event.target.value) : null))
                            }
                            className="shrink-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs disabled:opacity-40 cursor-pointer"
                          >
                            <option value="">No role</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* US-4.3. The owner's row offers nothing, and that is
                            not squeamishness: `ChannelMemberDetailView` answers
                            400 for it, because `ERD.tex` makes
                            `Channel : ChannelMember` a `1 : 1..N` and a channel
                            whose owner left is one nobody can administer. */}
                        {mayRemoveMember && !member.is_owner && (
                          <button
                            type="button"
                            onClick={() => kick(member)}
                            disabled={busyUserId === member.user.id}
                            className="shrink-0 text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer disabled:opacity-50"
                          >
                            {busyUserId === member.user.id ? '…' : 'Remove'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* US-4.4 / SH.1 — added directly, not invited. */}
              {mayAddMember && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Add a member
                  </h2>

                  <form onSubmit={searchDirectory} className="flex gap-2">
                    <input
                      type="text"
                      value={term}
                      placeholder="Search by username"
                      onChange={(event) => setTerm(event.target.value)}
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={searching || !term.trim()}
                      className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer disabled:opacity-50"
                    >
                      {searching ? 'Searching…' : 'Search'}
                    </button>
                  </form>

                  <div className="space-y-1">
                    {addable.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition"
                      >
                        <Avatar name={candidate.username} size="sm" />
                        <span className="flex-1 min-w-0 text-sm text-slate-300 truncate">
                          {candidate.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => add(candidate)}
                          disabled={busyUserId === candidate.id}
                          className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer disabled:opacity-50"
                        >
                          {busyUserId === candidate.id ? '…' : 'Add'}
                        </button>
                      </div>
                    ))}
                    {candidates.length > 0 && addable.length === 0 && (
                      <div className="text-xs text-slate-600">
                        Everyone matching that is already a member.
                      </div>
                    )}
                    {searched && candidates.length === 0 && (
                      <div className="text-xs text-slate-600">
                        Nobody matched that name. The directory matches whole and partial usernames,
                        and never lists your own account.
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    If somebody has turned invitations off, the API refuses and names them. That
                    setting is deliberately not readable in advance — SH.2 — so this cannot warn you
                    first.
                  </p>
                </div>
              )}

              {!mayAddMember && !mayRemoveMember && (
                <p className="text-xs text-slate-500">
                  Adding and removing members needs{' '}
                  <code className="text-slate-300">can_add_member</code> or{' '}
                  <code className="text-slate-300">can_remove_member</code>, neither of which you
                  hold here.
                </p>
              )}
            </section>
          </div>
          </div>
        )}
      </main>

      {confirmDialog}
    </div>
  );
}
