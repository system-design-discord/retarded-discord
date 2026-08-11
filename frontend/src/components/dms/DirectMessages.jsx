import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

// Extracting data logic into one place as requested by the card
const useChatData = (user) => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get('dms/');
        setConversations(response.data);
        if (response.data.length > 0) {
          setActiveChat(response.data[0]);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await api.get(`dms/${activeChat.id}/messages/`);
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [activeChat]);

  const sendMessage = async (content) => {
    if (!content.trim() || !activeChat) return;
    try {
      const response = await api.post(`dms/${activeChat.id}/messages/`, { content });
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return { conversations, activeChat, setActiveChat, messages, loading, sendMessage };
};

const DirectMessages = () => {
  const { user } = useContext(AuthContext);
  const [newMessage, setNewMessage] = useState('');
  
  // All data fetching is cleanly contained here
  const { 
    conversations, 
    activeChat, 
    setActiveChat, 
    messages, 
    loading, 
    sendMessage 
  } = useChatData(user);

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation Sidebar - Upgraded to Links */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🏠</span> Home
        </Link>
        <Link to="/dms" className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium transition cursor-pointer">
          <span>💬</span> Direct Messages
        </Link>
        <Link to="/groups" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👥</span> Groups
        </Link>
        <Link to="/channels" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>📢</span> Channels
        </Link>
        <Link to="/search" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔍</span> Search
        </Link>
        <Link to="/notifications" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>🔔</span> Notifications
        </Link>
        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl font-medium transition cursor-pointer">
          <span>👤</span> Profile
        </Link>
      </aside>

      {/* Conversations Sub-Sidebar */}
      <aside className="w-72 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col">
        <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Direct Messages</h3>
        <div className="space-y-1">
          {conversations.length > 0 ? (
            conversations.map(conv => (
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
            ))
          ) : (
            <div className="text-xs text-slate-500 p-2">No active conversations.</div>
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 bg-slate-900 flex flex-col">
        {activeChat ? (
          <>
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

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {loading ? (
                <div className="text-center text-xs text-slate-500">Loading messages...</div>
              ) : messages.length > 0 ? (
                messages.map(msg => {
                  const isOwn = msg.author_id === user?.id || msg.isOwn;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-slate-400 mb-1">{msg.author || msg.sender_username}</span>
                      <div className={`p-3.5 rounded-2xl max-w-lg shadow-md text-sm ${isOwn ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/80'}`}>
                        {msg.content || msg.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-slate-500">No messages yet. Send a message to start!</div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
              <input
                type="text"
                placeholder={`Message @${activeChat.userName || 'user'}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition cursor-pointer">
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