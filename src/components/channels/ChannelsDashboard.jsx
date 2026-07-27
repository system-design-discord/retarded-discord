import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ChannelsDashboard = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    // API logic to send message to the active topic
    setNewMessage('');
  };

  return (
    <div className="groups-dashboard" style={{ flexDirection: 'row', padding: 0 }}>
      <aside className="groups-sidebar" style={{ width: '200px' }}>
        <h3 style={{ marginBottom: '16px' }}>Navigation</h3>
        <ul className="group-list">
          <li onClick={() => navigate('/dashboard')}>Home</li>
          <li onClick={() => navigate('/dms')}>Direct Messages</li>
          <li onClick={() => navigate('/groups')}>Groups</li>
          <li className="active" onClick={() => navigate('/channels')}>Channels</li>
          <li onClick={() => navigate('/search')}>Search</li>
          <li onClick={() => navigate('/notifications')}>Notifications</li>
          <li onClick={() => navigate('/profile')}>Profile</li>
          <li onClick={() => navigate('/settings/account')}>Settings</li>
        </ul>
      </aside>

      <aside className="groups-sidebar" style={{ borderLeft: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '16px' }}>Your Channels</h3>
        <ul className="group-list">
          {channels.length > 0 ? (
            channels.map(channel => (
              <li key={channel.id} className={activeChannel?.id === channel.id ? 'active' : ''} onClick={() => setActiveChannel(channel)}>
                # {channel.name} {channel.hasUnread && <span style={{ float: 'right' }}>●</span>}
              </li>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>You are not in any channels.</p>
          )}
        </ul>
        <button className="btn-create-group" onClick={() => alert('Open Create Channel Modal')} style={{ marginTop: '16px' }}>+ Channel</button>
      </aside>

      <main className="group-chat-area">
        {activeChannel ? (
          <>
            <header className="chat-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <h2># {activeChannel.name}</h2>
                <div className="topics-row">
                  {activeChannel.topics && activeChannel.topics.map(topic => (
                    <span 
                      key={topic.id} 
                      className="topic-badge" 
                      style={{ background: activeTopic?.id === topic.id ? 'var(--btn-hover)' : 'var(--bg-main)' }}
                      onClick={() => setActiveTopic(topic)}
                    >
                      {topic.name}
                    </span>
                  ))}
                </div>
              </div>
              {activeTopic && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Topic: {activeTopic.name}</span>}
            </header>
            
            <div className="chat-history">
              {messages.length > 0 ? (
                messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble ${msg.isOwn ? 'own' : ''}`}>
                    <strong>{msg.author}:</strong> {msg.content}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 'auto' }}>
                  {activeTopic ? 'No messages in this topic yet.' : 'Select a topic to view messages.'}
                </p>
              )}
            </div>

            <form className="chat-compose" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0' }} onSubmit={handleSendMessage}>
              {activeChannel.mediaRestricted && (
                <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  Media sharing is RESTRICTED for your role in this channel.
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', padding: '12px 0 0 0' }}>
                <button type="button" disabled={activeChannel.mediaRestricted} style={{ opacity: activeChannel.mediaRestricted ? 0.5 : 1 }}>+ Attach</button>
                <input type="text" placeholder={`Message #${activeChannel.name}...`} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={!activeTopic} />
                <button type="submit" disabled={!activeTopic}>Send</button>
              </div>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Select a channel to view topics and messages.
          </div>
        )}
      </main>
    </div>
  );
};

export default ChannelsDashboard;