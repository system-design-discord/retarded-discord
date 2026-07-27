import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GroupInvitationPreferences = () => {
  const navigate = useNavigate();
  const [invitePref, setInvitePref] = useState('approval');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [feedback, setFeedback] = useState('Changes are saved after clicking Save Changes.');

  const handleSave = (e) => {
    e.preventDefault();
    // API logic
    setFeedback('Invitation preferences updated.');
  };

  const handleInviteAction = (id, action) => {
    // API logic to accept/decline
  };

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/dashboard')}>Home</li>
          <li onClick={() => navigate('/dms')}>Direct Messages</li>
          <li onClick={() => navigate('/groups')}>Groups</li>
          <li onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li className="active" onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>User Settings</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/settings/account')}>My Account</li>
          <li onClick={() => navigate('/profile/edit')}>Profile</li>
          <li onClick={() => navigate('/settings/privacy')}>Privacy</li>
          <li className="active" onClick={() => navigate('/settings/invitations')}>Group Invitations</li>
        </ul>
      </aside>

      <main className="settings-panel" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="settings-header">
          <h1>Group Invitation Preferences</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Choose who is allowed to add you to group conversations.</p>
        </div>

        <form onSubmit={handleSave}>
          <div className="settings-section">
            <h3>Who Can Add Me to Groups</h3>
            <div className="radio-group">
              <label><input type="radio" name="invite" value="everyone" checked={invitePref === 'everyone'} onChange={(e) => setInvitePref(e.target.value)} /> <strong>Everyone</strong></label>
              <label><input type="radio" name="invite" value="friends" checked={invitePref === 'friends'} onChange={(e) => setInvitePref(e.target.value)} /> <strong>Friends / contacts only</strong></label>
              <label><input type="radio" name="invite" value="approval" checked={invitePref === 'approval'} onChange={(e) => setInvitePref(e.target.value)} /> <strong>Ask for my approval (selected)</strong></label>
              <label><input type="radio" name="invite" value="no-one" checked={invitePref === 'no-one'} onChange={(e) => setInvitePref(e.target.value)} /> <strong>No one</strong></label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Pending Group Invitations</h3>
            {pendingInvites.length > 0 ? (
              pendingInvites.map(invite => (
                <div key={invite.id} className="toggle-row">
                  <div><strong>{invite.groupName}</strong><br/><span style={{fontSize:'12px', color:'var(--text-secondary)'}}>Invited by @{invite.inviter}</span></div>
                  <div className="action-buttons">
                    <button type="button" className="btn-save" onClick={() => handleInviteAction(invite.id, 'accept')}>Accept</button>
                    <button type="button" className="btn-cancel" onClick={() => handleInviteAction(invite.id, 'decline')}>Decline</button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>You have no pending group invitations.</p>
            )}
          </div>

          <div className="settings-footer">
            <div><strong>Feedback State</strong><p style={{ color: 'var(--text-secondary)' }}>{feedback}</p></div>
            <div className="action-buttons">
              <button type="button" className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-save">Save Changes</button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default GroupInvitationPreferences;