import { useState } from 'react';

// A password input with its own reveal toggle (#138).
//
// The state lives here rather than in the form, so three instances are three
// independent toggles and `Register` does not grow two booleans it would then
// have to keep apart. Nothing persists it: every field mounts masked.

export default function PasswordField({ label, className = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-slate-400 text-xs font-bold uppercase mb-2">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={visible ? 'text' : 'password'}
          // `pr-12` keeps the typed text out from under the button.
          className={`w-full px-4 py-3 pr-12 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition duration-200 text-sm ${className}`}
        />
        <button
          // `type="button"` is load-bearing: the default inside a <form> is
          // "submit", so without it revealing the password logs you in.
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
        >
          <span aria-hidden="true">{visible ? '🙈' : '👁️'}</span>
        </button>
      </div>
    </div>
  );
}
