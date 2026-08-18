import { useContext, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useGroup from '../../hooks/useGroup';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import Chat from '../chat/Chat';
import { Avatar } from '../chat/primitives';
import usePresence from '../../hooks/usePresence';

// US-2.2 — send and receive messages in a group.
//
// The third instance of the same surface, and it is wiring: the message list,
// the bubbles and the composer are the F-00 primitives that the direct-message
// view renders, reached through the same `Chat`. The only things this file adds
// are the group's name and its member list.
//
// The group itself comes from `useGroup` since `U-10`, so a rename or a
// membership change on the settings screen is reflected here on the next read
// rather than needing a reload — and `isAdmin` is derived in one place rather
// than by this file comparing ids. "The next read" used to mean *this*
// member's next read: `useGroup` re-read after its own writes and on
// `profileVersion`, which is a counter about people, so a rename by somebody
// else reached this header only when the screen remounted. It listens for
// `GROUP_UPDATED` now and the header follows within a frame.

export default function GroupChat() {
  const { isOnline } = usePresence();
  const { groupId } = useParams();
  const navigate = useNavigate();
  // `/chat/:groupId` has no query string of its own, but a search hit adds one
  // to name the message it matched (#129) — the same parameter the other two
  // shells read, so `Chat` receives it identically from all three.
  const [searchParams] = useSearchParams();
  const highlight = Number(searchParams.get('message')) || null;
  const { user } = useContext(AuthContext);

  const { group, members, admin, isAdmin, loading, error, gone } = useGroup(groupId);

  // Any member may delete a group (US-6.3, #124), so this is not the rare case
  // it looks like. There is nothing honest to render once it has happened —
  // the messages went with it — so the screen leaves rather than showing an
  // error about a group the reader was legitimately in a moment ago.
  useEffect(() => {
    if (gone) navigate('/groups', { replace: true });
  }, [gone, navigate]);

  // US-3.3 and US-3.5: the author always, and the group's admin over anybody's
  // message. The server decides this in roles.services.may_delete_message —
  // showing the control only mirrors what it will allow.
  const canDelete = (message) => message.sender?.id === user?.id || isAdmin;

  return (
    <div className="min-h-dvh h-dvh bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/groups" />

      {error && !loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-slate-400">
          {error}
          <Link to="/groups" className="text-indigo-400 hover:text-indigo-300 text-xs">
            Back to groups
          </Link>
        </div>
      ) : (
        <Chat
          kind="group"
          id={groupId}
          highlightMessageId={highlight}
          title={group?.name ?? 'Group'}
          avatar={group?.avatar ?? null}
          subtitle={group ? `${members.length} member${members.length === 1 ? '' : 's'}` : null}
          placeholder={group ? `Message ${group.name}…` : 'Message the group…'}
          emptyHint="Be the first to say something."
          canDelete={canDelete}
          headerExtra={
            // Shown to everyone, not only the admin: the member aside below is
            // `hidden lg:block`, so on a phone this link is the only route to
            // the member list at all — and since #124 it is also the route to
            // editing and deleting the group, which every member may do.
            <Link
              to={`/groups/${groupId}/settings`}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition"
            >
              ⚙️ Settings
            </Link>
          }
          aside={
            <aside className="w-60 shrink-0 border-l border-slate-800 bg-slate-900/60 p-4 overflow-y-auto hidden lg:block">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Members
                </h3>
                {isAdmin && (
                  <Link
                    to={`/groups/${groupId}/settings`}
                    className="text-[11px] text-slate-500 hover:text-indigo-400 transition"
                  >
                    Manage
                  </Link>
                )}
              </div>
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg">
                    <Avatar
                      name={member.username}
                      src={member.avatar}
                      online={isOnline(member.id)}
                      size="sm"
                    />
                    <span className="text-sm text-slate-300 truncate">{member.username}</span>
                    {member.id === admin?.id && (
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-indigo-400">
                        admin
                      </span>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-xs text-slate-600">No members listed.</div>
                )}
              </div>
            </aside>
          }
        />
      )}
    </div>
  );
}
