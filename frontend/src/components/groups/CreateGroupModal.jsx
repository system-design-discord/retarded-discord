import React, { useState } from 'react';
import api from '../../services/api';

const CreateGroupModal = ({ onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Group name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('groups/', { name: groupName });
      
      // Pass the newly created group back to the Dashboard to update the UI instantly
      if (onGroupCreated) {
        onGroupCreated(response.data);
      }
      
      // Close the modal upon success
      onClose();
    } catch (err) {
      // Catch duplicate name or invalid name errors from the API
      const errorMsg = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Failed to create group. Please try again.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-5">Create New Group</h2>
        
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Study Squad"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-400">Select Members</label>
            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm">
              <label className="flex items-center gap-3 cursor-pointer text-slate-300">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-slate-900 border-slate-700 accent-indigo-600" /> Arman (Backend Lead)
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-slate-300">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-slate-900 border-slate-700 accent-indigo-600" /> Arvin (Product Owner)
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-slate-300">
                <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-700 accent-indigo-600" /> Majid (Media / DB)
              </label>
            </div>
          </div>

          <p className="text-xs text-slate-500">Users can disable group invitations in Privacy Settings.</p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;