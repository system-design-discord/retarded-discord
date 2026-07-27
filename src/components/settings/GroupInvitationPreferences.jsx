// src/components/settings/GroupInvitationPreferences.jsx

import React from 'react';

const GroupInvitationPreferences = () => {
  return (
    <div className="settings-panel">
      {/* Mapped to Settings Wireframe - Group Invitation Preferences */}
      <div className="settings-header">
        <h1>Group Invitation Preferences</h1>
        <p>Choose who is allowed to add you to group conversations.</p>
      </div>

      <div className="settings-section">
        <h3>Who Can Add Me to Groups</h3>
        <p>This setting applies to every group invite sent to you across the system.</p>
        
        <div className="radio-group">
          <label>
            <input type="radio" name="invite-pref" value="everyone" />
            <strong>Everyone</strong>
            <span>Any user can add you to a group directly.</span>
          </label>
          <label>
            <input type="radio" name="invite-pref" value="friends" />
            <strong>Friends/contacts only</strong>
            <span>Only users you already know can add you.</span>
          </label>
          <label>
            <input type="radio" name="invite-pref" value="approval" defaultChecked />
            <strong>Ask for my approval (selected)</strong>
            <span>Every invite waits in Pending below.</span>
          </label>
          <label>
            <input type="radio" name="invite-pref" value="no-one" />
            <strong>No one</strong>
            <span>Disable group invitations entirely; no user may add you to a group.</span>
          </label>
        </div>
      </div>

      <div className="settings-section pending-invitations">
        <h3>Pending Group Invitations</h3>
        <p>Shown only while "Ask for my approval" is selected above.</p>
        
        <div className="invite-list">
          <div className="invite-item">
            <div className="invite-info">
              <strong>Study Squad</strong>
              <span>Invited by @maria_chen</span>
            </div>
            <div className="invite-actions">
              <button className="btn-accept">Accept</button>
              <button className="btn-decline">Decline</button>
            </div>
          </div>
          <div className="invite-item">
            <div className="invite-info">
              <strong>Course Project</strong>
              <span>Invited by @sam_lee</span>
            </div>
            <div className="invite-actions">
              <button className="btn-accept">Accept</button>
              <button className="btn-decline">Decline</button>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <div className="feedback-state">
          Changes are saved after the user clicks Save Changes.
        </div>
        <div className="action-buttons">
          <button type="button" className="btn-cancel">Cancel</button>
          <button type="submit" className="btn-save">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default GroupInvitationPreferences;