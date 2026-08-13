import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import NavSidebar from '../layout/NavSidebar';
import Chat from '../chat/Chat';
import { Avatar } from '../chat/primitives';

// US-2.2 — send and receive messages in a group.
//
// The third instance of the same surface, and it is wiring: the message list,
// the bubbles and the composer are the F-00 primitives that the direct-message
// view renders, reached through the same `Chat`. The only things this file adds
// are the group's name and its member list.

export default function GroupChat() {
  const { groupId } = useParams();
  const { user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api
      .get(`groups/${groupId}/`)
      .then(({ data }) => {
        if (!cancelled) setGroup(data);
      })
      .catch(() => {
        if (!cancelled) setError('This group could not be opened. You may not be a member of it.');
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const members = group?.members ?? [];
  const isAdmin = group?.admin?.id === user?.id;

  // US-3.3 and US-3.5: the author always, and the group's admin over anybody's
  // message. The server decides this in roles.services.may_delete_message —
  // showing the control only mirrors what it will allow.
  const canDelete = (message) => message.sender?.id === user?.id || isAdmin;

  return (
    <div className="min-h-screen h-screen bg-slate-950 text-slate-100 flex">
      <NavSidebar active="/groups" />

      {error ? (
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
          title={group?.name ?? 'Group'}
          subtitle={group ? `${members.length} member${members.length === 1 ? '' : 's'}` : null}
          placeholder={group ? `Message ${group.name}…` : 'Message the group…'}
          emptyHint="Be the first to say something."
          canDelete={canDelete}
          aside={
            <aside className="w-60 shrink-0 border-l border-slate-800 bg-slate-900/60 p-4 overflow-y-auto hidden lg:block">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                Members
              </h3>
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg">
                    <Avatar name={member.username} size="sm" />
                    <span className="text-sm text-slate-300 truncate">{member.username}</span>
                    {member.id === group?.admin?.id && (
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
