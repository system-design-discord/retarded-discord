// src/components/settings/PrivacySettings.jsx

import React from 'react';

const PrivacySettings = () => {
  return (
    <div className="settings-panel">
      {/* Mapped to Settings Wireframe - Privacy Screen */}
      <div className="settings-header">
        <h1>Privacy Settings</h1>
        <p>Control who can contact you and view your profile.</p>
      </div>

      <div className="settings-section">
        <h3>Direct Message Privacy</h3>
        <p>Manage who can start a direct conversation with you.</p>
        <div className="toggle-row">
          <span>Allow direct messages from non-friends</span>
          <input type="checkbox" className="toggle" /> {/* Off */}
        </div>
        <div className="toggle-row">
          <span>Allow messages from users in shared groups</span>
          <input type="checkbox" className="toggle" defaultChecked /> {/* On */}
        </div>
      </div>

      <div className="settings-section">
        <h3>Profile Visibility</h3>
        <p>Control what other users can see on your profile.</p>
        <div className="toggle-row">
          <span>Show my profile to other users</span>
          <input type="checkbox" className="toggle" defaultChecked /> {/* On */}
        </div>
        <div className="toggle-row">
          <span>Show my online status</span>
          <input type="checkbox" className="toggle" defaultChecked /> {/* On */}
        </div>
      </div>

      <div className="settings-section">
        <h3>Email Visibility</h3>
        <p>Keep email address hidden from other users.</p>
        <div className="toggle-row">
          <span>Show email address on public profile</span>
          <input type="checkbox" className="toggle" /> {/* Off */}
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

export default PrivacySettings;