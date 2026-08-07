import { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const MOCK_GROUP_MESSAGES = [
    { id: 1, text: 'سلام بچه‌ها، به چت روم خوش آمدید!', sender: { id: 2, username: 'آرمان' }, created_at: '10:00' },
    { id: 2, text: 'فرانت‌اند کاملاً به روز رسانی شد.', sender: { id: 1, username: 'امیر (شما)' }, created_at: '10:05' }
];

export default function Chat() {
    const { groupId } = useParams();
    const { user } = useContext(AuthContext);
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    
    // State برای ویرایش پیام
    const [editingId, setEditingId] = useState(null);
    const [editInput, setEditInput] = useState('');

    const ws = useRef(null);
    const messagesEndRef = useRef(null); 

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await api.get(`messages/?group_id=${groupId}`);
                setMessages(response.data);
            } catch (error) {
                console.warn("بک‌اند در دسترس نیست. لود پیام‌های ماک گروه...");
                setMessages(MOCK_GROUP_MESSAGES);
            } finally {
                setLoading(false);
            }
        };
        
        if (groupId) {
            fetchHistory();
        }
    }, [groupId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ارسال پیام
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMsgObj = {
            id: Date.now(),
            text: input,
            sender: { id: user?.id || 1, username: user?.username || 'امیر' },
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        try {
            await api.post('messages/', { text: input, group_id: groupId });
            setMessages((prev) => [...prev, newMsgObj]);
            setInput('');
        } catch (err) {
            setMessages((prev) => [...prev, newMsgObj]);
            setInput('');
        }
    };

    // حذف پیام (US-3.3)
    const handleDelete = (id) => {
        setMessages(prev => prev.filter(m => m.id !== id));
    };

    // ذخیره ویرایش پیام (US-3.1, US-3.2)
    const handleSaveEdit = (id) => {
        if (!editInput.trim()) return;
        setMessages(prev => prev.map(m => {
            if (m.id === id) {
                return { ...m, text: editInput, isEdited: true };
            }
            return m;
        }));
        setEditingId(null);
        setEditInput('');
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <div className="bg-gray-800 p-4 shadow-md border-b border-gray-700">
                <h2 className="text-xl font-bold text-blue-500">گفتگوی گروه شماره: {groupId}</h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {loading ? (
                    <div className="text-center text-gray-400 mt-10">در حال بارگذاری...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">هنوز پیامی ارسال نشده است...</div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.sender?.id === user?.id || msg.sender?.username?.includes('امیر');
                        return (
                            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <span className="text-xs text-gray-400 mb-1">{msg.sender?.username}</span>
                                <div className={`p-3 rounded-lg w-max max-w-xl ${isOwn ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    {editingId === msg.id ? (
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={editInput} 
                                                onChange={(e) => setEditInput(e.target.value)}
                                                className="bg-gray-800 text-white px-2 py-1 rounded text-sm"
                                            />
                                            <button onClick={() => handleSaveEdit(msg.id)} className="text-xs bg-green-600 px-2 rounded">ذخیره</button>
                                            <button onClick={() => setEditingId(null)} className="text-xs bg-gray-500 px-2 rounded">لغو</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="text-gray-100">{msg.text}</span>
                                            {msg.isEdited && <span className="text-xs italic text-gray-300 mr-2">(ویرایش‌شده)</span>}
                                        </div>
                                    )}
                                </div>
                                {isOwn && editingId !== msg.id && (
                                    <div className="flex gap-2 text-xs text-gray-400 mt-1">
                                        <span onClick={() => { setEditingId(msg.id); setEditInput(msg.text); }} className="cursor-pointer hover:text-blue-400">ویرایش</span>
                                        <span onClick={() => handleDelete(msg.id)} className="cursor-pointer hover:text-red-400">حذف</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
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