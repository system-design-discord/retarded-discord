import { useEffect, useState } from 'react';

// The avatar every conversation surface uses. Sized by prop rather than by the
// caller's own class string, so a bubble avatar and a sidebar avatar cannot
// drift apart.
//
// **It draws a picture now, and for a long time it could not.** There was no
// `src` at all — the component took a name and rendered its first letter — so a
// user could upload a photograph and never see it anywhere except their own
// profile page. Every member list, every message bubble and the direct-message
// rail all went through here, which is why one prop fixes all of them and why
// adding a second avatar component would have fixed none.
//
// The initial is still the fallback and is not a placeholder for a slow image:
// most users have no avatar, and `PublicUserSerializer` answers `null` for them.
//
// **`online` is presence, and it is a prop here for the same reason `src` is.**
// A dot rendered by each caller would be seven slightly different dots.
//
// **It draws groups and channels too.** `Group.avatar` and `Channel.avatar` have
// existed as long as `Profile.avatar` and are uploaded from the two settings
// screens, but nothing outside those screens ever drew one — every list, header
// and rail in the product rendered a group as text and a channel as a `#`.
// Nothing here had to change for that except the `alt`, which said *"X's
// avatar"* and reads as nonsense about a room; a caller drawing something that
// is not a person passes its own.

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-10 h-10 text-base',
};

const DOT_SIZES = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export default function Avatar({ name, src, alt, size = 'md', online, className = '' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  // A signed media URL expires (`common/signed_media.py`), and a `<img>` whose
  // token has aged out renders as a broken-image glyph rather than as nothing.
  // Falling back to the initial keeps a stale token looking like no avatar
  // instead of like a bug. Reset on `src` so a *new* picture gets its own try.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  const showImage = Boolean(src) && !broken;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`${SIZES[size] ?? SIZES.md} rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 overflow-hidden`}
        title={name}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt ?? (name ? `${name}'s avatar` : 'avatar')}
            className="w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          initial
        )}
      </div>

      {/* `online === undefined` means "this screen does not show presence",
          which is not the same as "offline" — so nothing is drawn for it. */}
      {online !== undefined && (
        <span
          aria-hidden="true"
          title={online ? `${name ?? 'This user'} is online` : `${name ?? 'This user'} is offline`}
          className={`absolute -bottom-0.5 -right-0.5 ${DOT_SIZES[size] ?? DOT_SIZES.md} rounded-full ring-2 ring-slate-900 ${
            online ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
        />
      )}
    </div>
  );
}
