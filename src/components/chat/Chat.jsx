import { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api'; 

export default function Chat() {
    const { groupId } = useParams();
    const { user } = useContext(AuthContext);
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const ws = useRef(null);
    const messagesEndRef = useRef(null); 

    // اسکرول خودکار به آخرین پیام
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get(`messages/?group_id=${groupId}`);
                setMessages(response.data);
            } catch (error) {
                console.error('خطا در دریافت تاریخچه چت:', error);
            }
        };
        fetchHistory();

        ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${groupId}/`);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const newMessage = {
                text: data.message,
                sender: { username: data.username }
            };
            setMessages((prev) => [...prev, newMessage]);
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [groupId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && ws.current && user) {
            ws.current.send(JSON.stringify({ 
                message: input,
                user_id: user.id, 
                username: user.username
            }));
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <div className="bg-gray-800 p-4 shadow-md border-b border-gray-700">
                <h2 className="text-xl font-bold text-blue-500">گروه چت شماره: {groupId}</h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">هنوز پیامی ارسال نشده است...</div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`flex flex-col ${msg.sender?.username === user?.username ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs text-gray-400 mb-1">{msg.sender?.username}</span>
                            <div className={`p-3 rounded-lg w-max max-w-xl ${msg.sender?.username === user?.username ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                <span className="text-gray-100">{msg.text}</span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-gray-800 border-t border-gray-700">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="پیام خود را بنویسید..."
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors">
                        ارسال
                    </button>
                </form>
            </div>
        </div>
    );
}