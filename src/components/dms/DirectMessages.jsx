import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const MOCK_CONVERSATIONS = [
  { id: 1, userName: 'Arman (Backend Lead)', isOnline: true, lastMessagePreview: 'API endpoints are ready.' },
  { id: 2, userName: 'Arvin (Product Owner)', isOnline: true, lastMessagePreview: 'Sprint 2 backlog is prioritized.' },
  { id: 3, userName: 'Majid (Media & DB)', isOnline: false, lastMessagePreview: 'Database fixtures uploaded.' },
];

const MOCK_MESSAGES = {
  1: [
    { id: 101, author: 'Arman (Backend Lead)', content: 'Hey Amir, direct messaging API is live.', isOwn: false, time: '10:30 AM' },
    { id: 102, author: 'Amir (You)', content: 'Great! Frontend React SPA components are fully connected.', isOwn: true, time: '10:32 AM' },
    { id: 103, author: 'Arman (Backend Lead)', content: 'Awesome, token refresh and error handling tested.', isOwn: false, time: '10:35 AM' },
  ],
  2: [
    { id: 201, author: 'Arvin (Product Owner)', content: 'Amir, please create a PR for US-2.5 DM integration.', isOwn: false, time: '09:00 AM' }
  ]
};

const DirectMessages = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get('dms/');
        setConversations(response.data);
      } catch (error) {
        setIsMockMode(true);
        setConversations(MOCK_CONVERSATIONS);
        setActiveChat(MOCK_CONVERSATIONS[0]);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    if (isMockMode) {
      setMessages(MOCK_MESSAGES[activeChat.id] || []);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await api.get(`dms/${activeChat.id}/messages/`);
        setMessages(response.data);
      } catch (error) {
        setMessages(MOCK_MESSAGES[activeChat.id] || []);
      }
    };
    fetchMessages();
  }, [activeChat, isMockMode]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const newMsgObj = {
      id: Date.now(),
      author: user?.username || 'Amir (You)',
      content: newMessage,
      isOwn: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (isMockMode) {
      setMessages(prev => [...prev, newMsgObj]);
      setNewMessage('');
      return;
    }

    try {
      const response = await api.post(`dms/${activeChat.id}/messages/`, { content: newMessage });
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      setMessages(prev => [...prev, newMsgObj]);
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🏠</span> Home
        </button>
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>💬</span> Direct Messages
        </button>
        <button onClick={() => navigate('/groups')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👥</span> Groups
        </button>
        <button onClick={() => navigate('/channels')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
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

        {isMockMode && (
          <div className="mt-auto p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
            <span>⚡</span> Offline Mock Active
          </div>
        )}
      </aside>

      {/* Conversations Sub-Sidebar */}
      <aside className="w-72 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col">
        <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Direct Messages</h3>
        <div className="space-y-1">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveChat(conv)}
              className={`p-3 rounded-xl transition cursor-pointer flex items-center gap-3 ${
                activeChat?.id === conv.id ? 'bg-indigo-600/20 border border-indigo-500/30 text-white' : 'hover:bg-slate-800/50 text-slate-300'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-indigo-400">
                {conv.userName ? conv.userName[0] : 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-bold text-sm truncate">{conv.userName || conv.receiver_username}</div>
                <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${conv.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                  {conv.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 bg-slate-900 flex flex-col">
        {activeChat ? (
          <>
            {/* Header */}
            <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400">
                  {activeChat.userName ? activeChat.userName[0] : 'U'}
                </div>
                <div>
                  <h2 className="font-bold text-slate-100">{activeChat.userName || activeChat.receiver_username}</h2>
                  <span className="text-xs text-emerald-400">● Online</span>
                </div>
              </div>
            </header>

            {/* Message History */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-slate-400 mb-1">{msg.author || msg.sender_username}</span>
                  <div
                    className={`p-3.5 rounded-2xl max-w-lg shadow-md text-sm ${
                      msg.isOwn
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/80'
                    }`}
                  >
                    {msg.content || msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">{msg.time || 'Just now'}</span>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
              <input
                type="text"
                placeholder={`Message @${activeChat.userName || 'user'}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a conversation to start messaging.
          </div>
        )}
      </main>
    </div>
  );
};

export default DirectMessages;