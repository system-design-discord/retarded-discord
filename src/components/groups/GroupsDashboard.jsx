import React from 'react';
import { useNavigate } from 'react-router-dom';

const GroupsDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      {/* Global Navigation Sidebar */}
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/dashboard')}>Home</li>
          <li onClick={() => navigate('/dms')}>Direct Messages</li>
          <li className="active" onClick={() => navigate('/groups')}>Groups</li>
          <li onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      {/* Groups Sidebar */}
      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>Your Groups</h3>
        <ul className="group-list">
          <li className="active">Project Team</li>
          <li>Study Squad</li>
        </ul>
        <button className="btn-create-group" onClick={() => alert('Open Create Group Modal')}>+ New Group</button>
      </aside>

      {/* Main Chat Area */}
      <main className="group-chat-area">
        <header className="chat-header">
          <h2>Project Team</h2>
          <button className="btn-manage-members">Manage Members</button>
        </header>
        
        <div className="chat-history">
          <div className="chat-bubble"><strong>Maria Chen:</strong> files uploaded</div>
        </div>

        <form className="chat-compose" onSubmit={(e) => e.preventDefault()}>
          <button type="button" className="btn-attach">+ Attach</button>
          <button type="button" className="btn-schedule">Schedule</button>
          <input type="text" placeholder="Type a message..." />
          <button type="submit" className="btn-send">Send</button>
        </form>
      </main>
    </div>
  );
};

export default GroupsDashboard;