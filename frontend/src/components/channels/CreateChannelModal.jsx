import { useState } from 'react';

// US-4.1 — "create a channel, so that I become its admin."
//
// The second half of that sentence needs nothing from this form.
// `Channel.objects.create_with_owner` writes the creator's `ChannelMember` in
// the same call, and `roles.services` treats the owner as implicitly holding
// all eight permissions — so there is no membership request to make afterwards
// and no role to assign. Creating it *is* becoming its admin.
//
// Mirrors `groups/CreateGroupModal.jsx`, minus that file's member checkboxes:
// those are a static mockup, and adding members to a channel is a real
// endpoint gated on `can_add_member`. Offering three hard-coded names here
// would be a control that does nothing, which is what F-06 spent its card
// removing from this directory.

export default function CreateChannelModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    // The hook reports the server's refusal on the screen behind this modal,
    // and answers null rather than throwing. Closing only on success is what
    // keeps a rejected name in the field the user can fix it in.
    const created = await onCreate({ name: name.trim(), description: description.trim() });
    setSubmitting(false);
    if (created) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">New channel</h2>
        <p className="text-xs text-slate-500 mb-5">
          You become its admin, holding all eight permissions.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400" htmlFor="channel-name">
              Name
            </label>
            <input
              id="channel-name"
              type="text"
              autoFocus
              value={name}
              placeholder="e.g. announcements"
              onChange={(event) => setName(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400" htmlFor="channel-description">
              Description <span className="text-slate-600 normal-case font-medium">· optional</span>
            </label>
            <textarea
              id="channel-description"
              rows={3}
              value={description}
              placeholder="What is this channel for?"
              onChange={(event) => setDescription(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-40 cursor-pointer"
            >
              {submitting ? 'Creating…' : 'Create channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
