import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CreateGroupModal from './CreateGroupModal';
import useGroups from '../../hooks/useGroups';
import { Avatar, EmptyState } from '../chat/primitives';
import NavSidebar from '../layout/NavSidebar';

// US-5.1 — the groups you belong to, and the way into each one.
//
// This screen showed "No Groups Yet" to everybody, always. It read the
// paginated body as an array, so `groups.length` was `undefined` and the empty
// state was the only branch it could reach — issue #77's last survivor. The fix
// is not a line here but `useGroups`, which goes through `lib/pagination`.
//
// Three fields it rendered do not exist on `GroupSerializer` either:
// `group.title`, `group.lastMessage` and `group.memberCount`. A group has
// `name`, `description` and a nested `members`, so that is what is shown.
//
// `U-13` removed this file's own copy of the navigation rail in favour of
// `NavSidebar`, which is what fixed the screen below 390px: the inlined rail was
// a fixed 256px and did not collapse.

export default function GroupsDashboard() {
  const navigate = useNavigate();
  const { groups, loading, error, setError, create } = useGroups();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/groups" />

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-white">Your Groups</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage and participate in private group conversations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/20 shrink-0"
            >
              + New Group
            </button>
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

          {loading ? (
            <div className="text-center py-10 text-slate-500">Loading your groups...</div>
          ) : groups.length > 0 ? (
            <div className="grid gap-4">
              {groups.map((group) => {
                const members = group.members?.length ?? 0;

                return (
                  <div
                    key={group.id}
                    className="p-5 bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl transition flex justify-between items-center gap-4 group"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/groups/${group.id}/chat`)}
                      className="flex-1 min-w-0 text-left cursor-pointer flex items-start gap-3"
                    >
                      {/* A-3's other half: `Group.avatar` has been uploadable
                          from the settings screen and drawn nowhere else, so a
                          group with a picture and one without looked identical
                          on the only screen that lists them. */}
                      <Avatar name={group.name} src={group.avatar} alt={group.name} size="lg" />
                      <span className="min-w-0">
                        <h3 className="text-base font-bold text-slate-200 group-hover:text-indigo-400 transition truncate">
                          {group.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {group.description || 'No description.'}
                        </p>
                      </span>
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full">
                        {members} {members === 1 ? 'Member' : 'Members'}
                      </span>
                      {/* Offered to every member since #124: the settings
                          screen is where editing and deleting the group live,
                          and both are member rights. Behind `isGroupAdmin` it
                          was the admin's only, which left a member with no
                          route to a story they are the subject of. */}
                      <Link
                        to={`/groups/${group.id}/settings`}
                        className="text-xs text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                      >
                        ⚙️ Settings
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 border border-slate-800 rounded-2xl bg-slate-900">
              <EmptyState
                icon="👥"
                title="No groups yet"
                hint="Create one to start a conversation with several people at once."
              />
            </div>
          )}
        </div>

        {showModal && (
          <CreateGroupModal
            onClose={() => setShowModal(false)}
            onCreate={async (body) => {
              const created = await create(body);
              // Land where members are actually added, rather than in a group
              // whose only member is the person who just made it.
              if (created) navigate(`/groups/${created.id}/settings`);
              return created;
            }}
          />
        )}
      </main>
    </div>
  );
}
