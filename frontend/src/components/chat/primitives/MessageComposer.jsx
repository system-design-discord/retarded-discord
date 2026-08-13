import { useState } from 'react';

// Send and clear — and only clear once the server has accepted the message.
// The old Chat.jsx cleared the input inside its catch block as well, so a
// rejected write looked exactly like a successful one (issue #78).

export default function MessageComposer({ onSend, placeholder = 'Write a message…', disabled = false }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending || disabled) return;

    setSending(true);
    try {
      await onSend(body);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
      <input
        type="text"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || sending || !text.trim()}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 sm:px-6 py-3 rounded-xl transition cursor-pointer shrink-0"
      >
        {sending ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
