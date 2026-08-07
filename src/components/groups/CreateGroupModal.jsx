import React, { useState } from 'react';

const CreateGroupModal = ({ onClose }) => {
  const [groupName, setGroupName] = useState('');

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md space-y-5 shadow-2xl">
        <h2 className="text-xl font-bold text-white">Create New Group</h2>
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-400">Group Name</label>
          <input
            type="text"
            placeholder="e.g. Study Squad"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-slate-400">Select Members</label>
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm">
            <label className="flex items-center gap-3 cursor-pointer text-slate-300">
              <input type="checkbox" defaultChecked className="rounded accent-indigo-600" /> Arman (Backend Lead)
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-slate-300">
              <input type="checkbox" defaultChecked className="rounded accent-indigo-600" /> Arvin (Product Owner)
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-slate-300">
              <input type="checkbox" className="rounded accent-indigo-600" /> Majid (Media / DB)
            </label>
          </div>
        </div>

        <p className="text-xs text-slate-500">Users can disable group invitations in Privacy Settings.</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/20"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;