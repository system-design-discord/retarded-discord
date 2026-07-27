import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GroupsDashboard = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    // API logic to send group message
    setNewMessage('');
  };

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
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

      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>Your Groups</h3>
        <ul className="group-list">
          {groups.length > 0 ? (
            groups.map(group => (
              <li key={group.id} className={activeGroup?.id === group.id ? 'active' : ''} onClick={() => setActiveGroup(group)}>
                {group.name}
              </li>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>You are not in any groups.</p>
          )}
        </ul>
        <button className="btn-create-group" onClick={() => alert('Open Create Group Modal')}>+ New Group</button>
      </aside>

      <main className="group-chat-area">
        {activeGroup ? (
          <>
            <header className="chat-header">
              <h2>{activeGroup.name}</h2>
              <button className="btn-manage-members">Manage Members</button>
            </header>
            
            <div className="chat-history">
              {messages.length > 0 ? (
                messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble ${msg.isOwn ? 'own' : ''}`}>
                    <strong>{msg.author}:</strong> {msg.content}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 'auto' }}>No messages in this group yet.</p>
              )}
            </div>

            <form className="chat-compose" onSubmit={handleSendMessage}>
              <button type="button" className="btn-attach">+ Attach</button>
              <button type="button" className="btn-schedule">Schedule</button>
              <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
              <button type="submit" className="btn-send">Send</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Select or create a group to view messages.
          </div>
        )}
      </main>
    </div>
  );
};

export default GroupsDashboard;