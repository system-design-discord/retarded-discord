import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ManageRolesModal from './ManageRolesModal';

const INITIAL_CHANNELS = [
  {
    id: 1,
    name: 'general-discussion',
    hasUnread: false,
    mediaRestricted: false,
    userRole: 'admin',
    topics: [
      { id: 101, name: 'general' },
      { id: 102, name: 'assignments' },
      { id: 103, name: 'course-resources' }
    ]
  },
  {
    id: 2,
    name: 'announcements',
    hasUnread: true,
    mediaRestricted: true,
    userRole: 'member',
    topics: [
      { id: 201, name: 'ta-updates' },
      { id: 202, name: 'sprint-demo' }
    ]
  },
  {
    id: 3,
    name: 'frontend-help',
    hasUnread: false,
    mediaRestricted: false,
    userRole: 'admin',
    topics: [
      { id: 301, name: 'react-vite' },
      { id: 302, name: 'github-issues' }
    ]
  }
];

const INITIAL_TOPIC_MESSAGES = {
  101: [
    { id: 1, author: 'Arvin (PO)', content: 'Welcome to Sprint 2! Mandatory stories are in progress.', isOwn: false, isEdited: false, time: '02:20 PM' },
    { id: 2, author: 'Amir (You)', content: 'Frontend channel dashboards and topics are updated.', isOwn: true, isEdited: false, time: '02:22 PM' }
  ]
};

const ChannelsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [channels, setChannels] = useState(INITIAL_CHANNELS);
  const [activeChannel, setActiveChannel] = useState(INITIAL_CHANNELS[0]);
  const [activeTopic, setActiveTopic] = useState(INITIAL_CHANNELS[0].topics[0]);
  const [topicMessages, setTopicMessages] = useState(INITIAL_TOPIC_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [showRolesModal, setShowRolesModal] = useState(false);

  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    if (channel.topics && channel.topics.length > 0) {
      setActiveTopic(channel.topics[0]);
    } else {
      setActiveTopic(null);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTopic) return;

    const newMsg = {
      id: Date.now(),
      author: user?.username || 'Amir (You)',
      content: newMessage,
      isOwn: true,
      isEdited: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTopicMessages(prev => ({
      ...prev,
      [activeTopic.id]: [...(prev[activeTopic.id] || []), newMsg]
    }));
    setNewMessage('');
  };

  const handleDeleteMessage = (msgId) => {
    if (!activeTopic) return;
    setTopicMessages(prev => ({
      ...prev,
      [activeTopic.id]: prev[activeTopic.id].filter(m => m.id !== msgId)
    }));
  };

  const handleSaveEdit = (msgId) => {
    if (!editContent.trim() || !activeTopic) return;
    setTopicMessages(prev => ({
      ...prev,
      [activeTopic.id]: prev[activeTopic.id].map(m => {
        if (m.id === msgId) {
          return { ...m, content: editContent, isEdited: true };
        }
        return m;
      })
    }));
    setEditingMsgId(null);
    setEditContent('');
  };

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const createdChannel = {
      id: Date.now(),
      name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
      hasUnread: false,
      mediaRestricted: false,
      userRole: 'admin',
      topics: [{ id: Date.now() + 1, name: 'general' }]
    };

    setChannels(prev => [...prev, createdChannel]);
    setActiveChannel(createdChannel);
    setActiveTopic(createdChannel.topics[0]);
    setNewChannelName('');
    setShowNewChannelModal(false);
  };

  const handleCreateTopic = (e) => {
    e.preventDefault();
    if (!newTopicName.trim() || !activeChannel) return;

    const createdTopic = {
      id: Date.now(),
      name: newTopicName.toLowerCase().replace(/\s+/g, '-')
    };

    const updatedChannels = channels.map(ch => {
      if (ch.id === activeChannel.id) {
        return { ...ch, topics: [...ch.topics, createdTopic] };
      }
      return ch;
    });

    setChannels(updatedChannels);
    setActiveChannel(updatedChannels.find(ch => ch.id === activeChannel.id));
    setActiveTopic(createdTopic);
    setNewTopicName('');
    setShowNewTopicModal(false);
  };

  const currentMessages = activeTopic ? (topicMessages[activeTopic.id] || []) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🏠</span> Home
        </button>
        <button onClick={() => navigate('/dms')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>💬</span> Direct Messages
        </button>
        <button onClick={() => navigate('/groups')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👥</span> Groups
        </button>
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>📢</span> Channels
        </button>
        <button onClick={() => navigate('/search')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔍</span> Search
        </button>
        <button onClick={() => navigate('/notifications')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </button>
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </button>
      </aside>

      {/* Channels List */}
      <aside className="w-72 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Channels</h3>
          <button onClick={() => setShowNewChannelModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
            + Channel
          </button>
        </div>
        <div className="space-y-1">
          {channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => handleSelectChannel(channel)}
              className={`p-3 rounded-xl transition cursor-pointer flex justify-between items-center ${
                activeChannel?.id === channel.id ? 'bg-indigo-600/20 border border-indigo-500/30 text-white font-bold' : 'hover:bg-slate-800/50 text-slate-300'
              }`}
            >
              <span># {channel.name}</span>
              {channel.hasUnread && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 bg-slate-900 flex flex-col">
        {activeChannel ? (
          <>
            {/* Header with Topics */}
            <header className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-100"># {activeChannel.name}</h2>
                  {activeChannel.userRole === 'admin' && (
                    <button onClick={() => setShowRolesModal(true)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg border border-slate-700 cursor-pointer">
                      ⚙ Roles & Permissions
                    </button>
                  )}
                </div>

                {/* Topics Row */}
                <div className="flex items-center gap-2">
                  {activeChannel.topics.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => setActiveTopic(topic)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        activeTopic?.id === topic.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      #{topic.name}
                    </button>
                  ))}
                  {activeChannel.userRole === 'admin' && (
                    <button onClick={() => setShowNewTopicModal(true)} className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition cursor-pointer">
                      + Topic
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {currentMessages.length > 0 ? (
                currentMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400 font-medium">{msg.author}</span>
                      <span className="text-[10px] text-slate-500">{msg.time}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-lg shadow-md text-sm ${
                        msg.isOwn
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/80'
                      }`}
                    >
                      {editingMsgId === msg.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
                          />
                          <button onClick={() => handleSaveEdit(msg.id)} className="bg-emerald-600 text-xs px-3 py-1 rounded-lg font-bold">Save</button>
                          <button onClick={() => setEditingMsgId(null)} className="bg-slate-700 text-xs px-3 py-1 rounded-lg">Cancel</button>
                        </div>
                      ) : (
                        <div>
                          {msg.content}
                          {msg.isEdited && <span className="text-[10px] italic text-slate-400 ml-2">(edited)</span>}
                        </div>
                      )}
                    </div>

                    {msg.isOwn && editingMsgId !== msg.id && (
                      <div className="flex gap-3 text-[11px] text-slate-400 mt-1">
                        <button onClick={() => { setEditingMsgId(msg.id); setEditContent(msg.content); }} className="hover:text-indigo-400 cursor-pointer">Edit</button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="hover:text-rose-400 cursor-pointer">Delete</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  No messages in #{activeTopic?.name} yet. Send the first message!
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900 flex flex-col gap-2">
              {activeChannel.mediaRestricted && (
                <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                  ⚠️ Media sharing is restricted in this channel for your role.
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" disabled={activeChannel.mediaRestricted} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                  + File
                </button>
                <input
                  type="text"
                  placeholder={activeTopic ? `Message #${activeTopic.name}...` : 'Select a topic...'}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!activeTopic}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={!activeTopic}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Select a channel to view topics.</div>
        )}
      </main>

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create New Channel</h3>
            <input
              type="text"
              placeholder="channel-name"
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewChannelModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm hover:bg-slate-700">Cancel</button>
              <button onClick={handleCreateChannel} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create New Topic in #{activeChannel?.name}</h3>
            <input
              type="text"
              placeholder="topic-name"
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewTopicModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm hover:bg-slate-700">Cancel</button>
              <button onClick={handleCreateTopic} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500">Create Topic</button>
            </div>
          </div>
        </div>
      )}

      {/* Roles & Permissions Modal */}
      {showRolesModal && <ManageRolesModal channelName={activeChannel?.name} onClose={() => setShowRolesModal(false)} />}
    </div>
  );
};

export default ChannelsDashboard;