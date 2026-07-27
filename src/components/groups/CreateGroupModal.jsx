// src/components/groups/CreateGroupModal.jsx

import React from 'react';

const CreateGroupModal = () => {
  return (
    <div className="modal-overlay">
      {/* Mapped to Dashboard Wireframe - Groups (Modal Overlay) */}
      <div className="create-group-modal">
        <h2>Create Group</h2>
        
        <div className="form-group">
          <label>Name</label>
          <input type="text" placeholder="Study Squad" />
        </div>

        <div className="form-group">
          <label>Add friends</label>
          <input type="text" placeholder="Search friends..." />
        </div>

        <div className="friends-selection-list">
          <label>
            <input type="checkbox" defaultChecked /> Sam Lee
          </label>
          <label>
            <input type="checkbox" defaultChecked /> Maria Chen
          </label>
          <label>
            <input type="checkbox" /> Lee J.
          </label>
        </div>

        <p className="privacy-hint">
          A user may disable group invitations entirely in Settings.
        </p>

        <div className="modal-actions">
          <button type="button" className="btn-cancel">Cancel</button>
          <button type="button" className="btn-create">Create Group</button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;