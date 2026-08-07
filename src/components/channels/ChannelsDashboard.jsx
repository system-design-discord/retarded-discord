import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const ChannelsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await api.get('channels/');
        setChannels(response.data);
        if (response.data.length > 0) {
          setActiveChannel(response.data[0]);
          if (response.data[0].topics?.length > 0) {
            setActiveTopic(response.data[0].topics[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      }
    };
    fetchChannels();
  }, []);

  useEffect(() => {
    if (!activeTopic) return;
    const fetchTopicMessages = async () => {
      try {
        const response = await api.get(`channels/${activeChannel.id}/topics/${activeTopic.id}/messages/`);
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching topic messages:", error);
      }
    };
    fetchTopicMessages();
  }, [activeTopic]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTopic) return;

    try {
      const response = await api.post(`channels/${activeChannel.id}/topics/${activeTopic.id}/messages/`, {
        content: newMessage
      });
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending topic message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-2">
        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</div>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>🏠</span> Home</button>
        <button onClick={() => navigate('/dms')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>💬</span> Direct Messages</button>
        <button onClick={() => navigate('/groups')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>👥</span> Groups</button>
        <button className="flex items-center gap-3 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium cursor-pointer"><span>📢</span> Channels</button>
        <button onClick={() => navigate('/search')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>🔍</span> Search</button>
        <button onClick={() => navigate('/notifications')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>🔔</span> Notifications</button>
        <button onClick={() => navigate('/profile')} className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:bg-slate-800 rounded-xl font-medium cursor-pointer"><span>👤</span> Profile</button>
      </aside>

      {/* Channels List */}
      <aside className="w-72 bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col">
        <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-4">Channels</h3>
        <div className="space-y-1">
          {channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => {
                setActiveChannel(channel);
                if (channel.topics?.length > 0) setActiveTopic(channel.topics[0]);
              }}
              className={`p-3 rounded-xl transition cursor-pointer ${
                activeChannel?.id === channel.id ? 'bg-indigo-600/20 text-white font-bold' : 'hover:bg-slate-800/50 text-slate-300'
              }`}
            >
              # {channel.name}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 bg-slate-900 flex flex-col">
        {activeChannel ? (
          <>
            <header className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100"># {activeChannel.name}</h2>
              <div className="flex gap-2">
                {activeChannel.topics?.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTopic(topic)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      activeTopic?.id === topic.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{topic.name}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className="p-3 bg-slate-800 border border-slate-700/80 rounded-xl">
                  <div className="text-xs text-indigo-400 font-bold mb-1">{msg.author}</div>
                  <div className="text-sm text-slate-200">{msg.content}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-3">
              <input
                type="text"
                placeholder={`Message #${activeTopic?.name || 'channel'}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none"
              />
              <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold cursor-pointer">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Select a channel to start.</div>
        )}
      </main>
    </div>
  );
};

export default ChannelsDashboard;