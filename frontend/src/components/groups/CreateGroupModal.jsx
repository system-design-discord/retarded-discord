import { useState } from 'react';

// US-5.1 — name a group and create it.
//
// Presentational, like `CreateChannelModal`: the write is `useGroups.create`,
// passed in as `onCreate`, and the hook reports the server's refusal on the
// screen behind this modal. Closing only on success is what keeps a rejected
// name in the field the user can fix it in.
//
// It used to POST directly and to offer a "Select Members" list of three
// hardcoded names — Arman, Arvin and Majid — with checkboxes that were wired to
// nothing. `CreateChannelModal` omitted the same list deliberately when it was
// written. Members are added after the group exists, on the settings screen,
// against the real user directory, and against a server that may refuse each
// one; a checkbox list here could not honour that.

export default function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    const created = await onCreate({ name: name.trim(), description: description.trim() });
    setSubmitting(false);
    if (created) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-5">Create New Group</h2>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400" htmlFor="group-name">
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              placeholder="e.g. Study Squad"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-bold uppercase text-slate-400"
              htmlFor="group-description"
            >
              Description <span className="text-slate-600 normal-case font-normal">optional</span>
            </label>
            <textarea
              id="group-description"
              rows={3}
              placeholder="What is this group for?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <p className="text-xs text-slate-500">
            You will be its admin. Add members afterwards from the group&apos;s settings — anyone who
            has turned group invitations off will be refused there, by the server.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
