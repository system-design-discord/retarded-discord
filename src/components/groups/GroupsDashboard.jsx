// src/components/groups/GroupsDashboard.jsx

import React from 'react';

const GroupsDashboard = () => {
  return (
    <div className="groups-dashboard">
      {/* Mapped to Dashboard Wireframe - Groups */}
      <div className="groups-header">
        <h1>Groups</h1>
        <p>Text spaces for select friends - without channel-level complexity.</p>
      </div>

      <div className="groups-layout">
        <aside className="groups-sidebar">
          <h3>Your Groups</h3>
          <ul className="group-list">
            <li className="active">Project Team</li>
            <li>Study Squad</li>
          </ul>
          <button className="btn-create-group">+ New Group</button>
        </aside>

        <main className="group-chat-area">
          <header className="chat-header">
            <h2>Project Team</h2>
            <button className="btn-manage-members">Manage Members</button>
          </header>
          
          <div className="chat-history">
            {/* Messages will render here */}
            <div className="message">
              <strong>Maria Chen:</strong> files uploaded
            </div>
          </div>

          <div className="chat-compose">
            <button className="btn-attach">+ Attach</button>
            <button className="btn-schedule">Schedule</button>
            <input type="text" placeholder="Type a message..." />
            <button className="btn-send">Send</button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GroupsDashboard;