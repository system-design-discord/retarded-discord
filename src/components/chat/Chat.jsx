import { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function Chat() {
    const { groupId } = useParams(); 
    const { user } = useContext(AuthContext); 
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const ws = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${groupId}/`);

        ws.current.onopen = () => {
            console.log('متصل شد به اتاق چت:', groupId);
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages((prevMessages) => [...prevMessages, data.message]);
        };

        ws.current.onclose = () => {
            console.log('اتصال قطع شد');
        };

        // clean up before leaving
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [groupId]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && ws.current) {
            ws.current.send(JSON.stringify({ 
                message: `${user?.username || 'کاربر'}: ${input}` 
            }));
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            {/* هدر چت */}
            <div className="bg-gray-800 p-4 shadow-md border-b border-gray-700">
                <h2 className="text-xl font-bold text-blue-500">گروه چت شماره: {groupId}</h2>
            </div>

            {/* لیست پیام‌ها */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">هنوز پیامی ارسال نشده است...</div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className="bg-gray-800 p-3 rounded-lg w-max max-w-xl">
                            <span className="text-gray-200">{msg}</span>
                        </div>
                    ))
                )}
            </div>

            {/* فرم ارسال پیام */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="پیام خود را بنویسید..."
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
                    >
                        ارسال
                    </button>
                </form>
            </div>
        </div>
    );
}