import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DirectMessages = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    // API logic to send message
    setNewMessage('');
  };

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/dashboard')}>Home</li>
          <li className="active" onClick={() => navigate('/dms')}>Direct Messages</li>
          <li onClick={() => navigate('/groups')}>Groups</li>
          <li onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>Conversations</h3>
        <input type="text" placeholder="Search DMs" style={{ width: '90%', marginBottom: '16px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
        <ul className="group-list">
          {conversations.length > 0 ? (
            conversations.map(conv => (
              <li key={conv.id} className={activeChat?.id === conv.id ? 'active' : ''} onClick={() => setActiveChat(conv)}>
                <strong>{conv.userName}</strong> <br/>
                <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{conv.isOnline ? '● Online' : conv.lastMessagePreview}</span>
              </li>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No active conversations.</p>
          )}
        </ul>
      </aside>

      <main className="group-chat-area">
        {activeChat ? (
          <>
            <header className="chat-header">
              <div>
                <h2 style={{ display: 'inline-block', marginRight: '12px' }}>{activeChat.userName}</h2>
                {activeChat.isOnline && <span style={{ fontSize: '12px', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '12px' }}>Online</span>}
              </div>
            </header>
            
            <div className="chat-history">
              {messages.length > 0 ? (
                messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble ${msg.isOwn ? 'own' : ''}`}>
                    <strong>{msg.author}:</strong> {msg.content}
                    {msg.isEdited && <span style={{ fontSize: '10px', fontStyle: 'italic', marginLeft: '4px' }}>(edited)</span>}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 'auto' }}>Start the conversation.</p>
              )}
            </div>

            <form className="chat-compose" onSubmit={handleSendMessage}>
              <button type="button">+ Attach</button>
              <button type="button">Schedule</button>
              <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Select a conversation to start messaging.
          </div>
        )}
      </main>
    </div>
  );
};

export default DirectMessages;