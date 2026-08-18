import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useGroup from '../../hooks/useGroup';
import { searchUsers } from '../../services/users';
import { removeMember as removeGroupMember } from '../../services/groups';
import readApiError from '../../lib/apiError';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import { Avatar, useConfirm } from '../chat/primitives';
import AvatarField from '../common/AvatarField';

// U-10 — US-5.2 and US-6.4. `M-05` delivered both server-side in Sprint 2 and
// they have been demonstrable only against curl since; this is the screen.
//
// **A route, not a modal over the chat.** `/groups/<id>/settings` mirrors
// `/channels/<id>/roles`, and the reason is the 390px rule: `GroupChat`'s
// member aside is `hidden lg:block`, so on a phone there is no member list at
// all today, let alone a way to manage one. A screen with four sections and a
// danger zone is also a page rather than a dialog, and "the change survives a
// reload" is trivially true of a URL.
//
// **Nothing here is hidden to enforce anything.** The server decides all of it
// — `roles.may_edit_group` / `may_delete_group` for the group itself, the
// members view's own gate for add and remove — and hiding a control a non-admin
// cannot use is a courtesy on top of a refusal that happens anyway. The one
// deliberate exception is the Remove button on the admin's own row, which *is*
// rendered for the admin: see below.
//
// **#124 moved the line these guards sit on.** Editing and deleting the group
// are member rights (doc.tex §4.6, US-6.3, US-6.4) and were drawn as the
// admin's, so a member opening this screen could read it and change nothing.
// Only member management is `isAdmin`-guarded now, which is the one thing
// user_stories_en.tex §Assumptions actually reserves.

export default function GroupSettings() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const {
    group,
    members,
    admin,
    isAdmin,
    loading,
    error,
    setError,
    update,
    addMember,
    removeMember,
    remove,
  } = useGroup(groupId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // A-3 — the picked file, held here rather than in `AvatarField`, because
  // `dirty` below has to count it.
  const [avatar, setAvatar] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [term, setTerm] = useState('');
  const [candidates, setCandidates] = useState([]);
  // U-13 — the existing branch below covers "found some, all already members".
  // A search that matched nobody at all rendered nothing, which is the same
  // class of bug and the more common one.
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  // #139 — the two destructive actions below confirm in the app's own dialog.
  // Declared with the rest of the state, above the loading and not-found
  // returns further down: a hook after an early return runs on some renders and
  // not others.
  const [confirm, confirmDialog] = useConfirm();

  // Seed the form from the server's answer, and re-seed whenever it changes —
  // including after a save, so the fields show what was stored rather than what
  // was typed.
  useEffect(() => {
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setAvatar(null);
  }, [group]);

  // A picked file counts. Leave it out and the Save button stays disabled with
  // an image sitting in the form — the screen would look like it worked and
  // store nothing (#104).
  const dirty =
    group &&
    (name !== (group.name ?? '') || description !== (group.description ?? '') || Boolean(avatar));

  const save = async (event) => {
    event.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    setSaved(false);
    const fields = { name: name.trim(), description: description.trim() };
    const failure = await update(avatar ? { ...fields, avatar } : fields);
    setSaving(false);
    setSaved(!failure);
  };

  const search = async (event) => {
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
    // Whether it succeeded or the server refused, the picker's copy of who is
    // in the group is now stale. Re-running the search is cheaper than
    // reasoning about it.
    setCandidates((current) => current.filter((row) => row.id !== candidate.id));
  };

  const kick = async (member) => {
    const isSelf = member.id === user?.id;
    const confirmed = await confirm({
      title: isSelf ? `Remove yourself from ${group.name}?` : `Remove ${member.username}?`,
      body: isSelf
        ? 'The API refuses this for the admin — there is no way to leave a group yet.'
        : `They lose access to ${group.name} and every message in it.`,
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;

    setBusyUserId(member.id);
    await removeMember(member.id);
    setBusyUserId(null);
  };

  // A-10 — the other half of SH.2. `allow_invites` keeps you out of a group you
  // do not want to join; until this there was nothing that got you out of one
  // you were already in, and this screen offered a Remove button on your own
  // row that a non-admin could not use. The admin is deliberately not offered
  // it: somebody has to administer the group, and the API answers 400.
  const leave = async () => {
    const confirmed = await confirm({
      title: `Leave ${group.name}?`,
      body:
        'You will stop receiving its messages. Any member can add you back, if you let them.',
      confirmLabel: 'Leave group',
    });
    if (!confirmed) return;

    // Deliberately not `useGroup.removeMember`: that one refreshes the group
    // after the write, and the group you have just left answers 404 to you —
    // correctly, but it means firing a request for a resource you no longer
    // have, and showing its refusal for the instant before the navigation.
    setLeaving(true);
    try {
      await removeGroupMember(groupId, user.id);
      navigate('/groups');
    } catch (caught) {
      setError(readApiError(caught, 'You could not be removed from this group.'));
      setLeaving(false);
    }
  };

  const destroy = async () => {
    const confirmed = await confirm({
      title: `Delete ${group.name}?`,
      body:
        'Its memberships and every message in it go with it. This cannot be undone.',
      confirmLabel: 'Delete group',
    });
    if (!confirmed) return;

    const failure = await remove();
    if (!failure) navigate('/groups');
  };

  // Somebody already in the group is not a candidate. The API would answer a
  // cheerful 200 having written nothing, so filtering here is what stops the
  // picker reporting a success that did not happen.
  const memberIds = new Set(members.map((member) => member.id));
  const addable = candidates.filter((candidate) => !memberIds.has(candidate.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <NavSidebar active="/groups" />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          Loading the group…
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        <NavSidebar active="/groups" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-slate-400 px-6 text-center">
          {error || 'This group could not be opened.'}
          <Link to="/groups" className="text-indigo-400 hover:text-indigo-300 text-xs">
            Back to groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/groups" />

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="min-w-0">
            <Link
              to={`/groups/${groupId}/chat`}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition"
            >
              ← Back to the conversation
            </Link>
            <h1 className="text-2xl font-extrabold text-white truncate mt-1">{group.name}</h1>
            <p className="text-slate-400 text-sm mt-1 truncate">
              {members.length} {members.length === 1 ? 'member' : 'members'}
              {admin && <> · admin @{admin.username}</>}
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

          {/* ------------------------------------------------ group info */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Group information
            </h2>

            {/* Every member gets the form, not only the admin — US-6.4 and
                doc.tex §4.6. Until #124 this was a ternary with a read-only
                branch whose copy told the member the API would refuse them,
                which was true of the code and of nothing else. */}
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
                <label className="text-xs font-bold uppercase text-slate-400" htmlFor="description">
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

              {/* A-3 — US-6.4 names three fields and this is the third. */}
              <AvatarField
                id="group-avatar"
                label="Image"
                currentUrl={group.avatar}
                file={avatar}
                onPick={setAvatar}
                hint="Any member can change the group's image."
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
          {/* --------------------------------------------------- members */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Members</h2>

            <ul className="space-y-1">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/40 transition"
                >
                  <Avatar name={member.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    {/* A-4 — US-10.2's whole justification is "so that I can
                        better identify my contacts", and until this the only
                        way to another user's profile in the entire SPA was the
                        View profile button on a direct-message header. You
                        could look up somebody you had already messaged and
                        nobody you merely shared a group with. */}
                    <Link
                      to={`/profile/${member.id}`}
                      className="block text-sm text-slate-200 truncate hover:text-indigo-400 transition"
                    >
                      {member.username}
                    </Link>
                  </div>
                  {member.id === admin?.id && (
                    <span className="text-[10px] uppercase tracking-wide text-indigo-400 shrink-0">
                      admin
                    </span>
                  )}
                  {/* Offered on every row including the admin's own, and that is
                      deliberate. A group has exactly one admin, so removing
                      yourself and removing the last admin are the same act, and
                      the API refuses it with a message worth reading. Hiding
                      the button would hide the refusal. */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => kick(member)}
                      disabled={busyUserId === member.id}
                      title={
                        member.id === admin?.id
                          ? 'The API refuses this — a group cannot lose its admin.'
                          : `Remove ${member.username}`
                      }
                      className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {busyUserId === member.id ? '…' : 'Remove'}
                    </button>
                  )}
                </li>
              ))}
              {members.length === 0 && (
                <li className="text-xs text-slate-600">No members listed.</li>
              )}
            </ul>

            {!isAdmin && (
              <p className="text-xs text-slate-500">
                Adding and removing members is the admin's, and it is the only thing here that is —
                the group's information and the group itself are yours to change like anyone else's.
                There is no way to leave a group yet; the API has no endpoint for it.
              </p>
            )}
          </section>

          {/* ---------------------------------------------- add a member */}
          {isAdmin && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Add a member
              </h2>

              <form onSubmit={search} className="flex gap-2">
                <input
                  type="text"
                  value={term}
                  placeholder="Search by username"
                  onChange={(event) => setTerm(event.target.value)}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={searching || !term.trim()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer disabled:opacity-50 shrink-0"
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
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer disabled:opacity-50 shrink-0"
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
                If somebody has turned group invitations off, the API refuses and names them. That
                setting is deliberately not readable in advance — SH.2 — so this cannot warn you
                first.
              </p>
            </section>
          )}

          {/* ----------------------------------------------- danger zone */}
          {/* US-6.3 — "the group can be disbanded upon the members' agreement".
              The agreement happens between the members; the product does not
              ask for it, so this is offered to every one of them. */}
          <section className="bg-slate-900 border border-rose-900/50 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase text-rose-400 tracking-wider">
              Danger zone
            </h2>
            {!isAdmin && (
              <div className="space-y-2 pb-3 border-b border-slate-800">
                <p className="text-xs text-slate-400">
                  Leaving takes you out and leaves the group standing. The admin cannot leave —
                  somebody has to hold the membership list.
                </p>
                <button
                  type="button"
                  onClick={leave}
                  disabled={leaving}
                  className="border border-rose-900/60 text-rose-300 hover:bg-rose-950/40 font-semibold px-5 py-2 rounded-xl text-sm transition cursor-pointer disabled:opacity-50"
                >
                  Leave this group
                </button>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Deleting the group removes every membership and every message in it, for everybody and
              not only for you. Any member can do this and nobody is asked first, so agree with them
              before you do. The API answers with no summary of what went, so this is the last time
              you will see it.
            </p>
            <button
              type="button"
              onClick={destroy}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-5 py-2 rounded-xl text-sm transition cursor-pointer"
            >
              Delete this group
            </button>
          </section>
        </div>
      </main>

      {confirmDialog}
    </div>
  );
}
