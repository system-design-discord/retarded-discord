import { useEffect, useState } from 'react';

/**
 * The image half of a settings form — A-3.
 *
 * US-6.1 asks to edit a channel's "name, description, **and image**" and US-6.4
 * asks for a group's "name, **image**, and description". `Group.avatar` and
 * `Channel.avatar` have always been writable `ImageField`s and the API has
 * always accepted them; what was missing was any screen offering a file input.
 * `/channels/:id/settings` said so out loud — *"The channel image is not
 * editable here yet."*
 *
 * It is one component rather than a copy on each of the two screens for the
 * usual reason, and for one specific one: the preview is an object URL, and an
 * object URL that is not revoked when it is replaced leaks the file it points
 * at for as long as the tab is open. That lifecycle is worth owning once.
 *
 * The parent owns the picked `File` because the parent owns the form — it needs
 * it in its `dirty` calculation, or the Save button stays disabled and the
 * screen looks like it worked while storing nothing, which is #104 exactly.
 *
 * **Removing an image is a third state, not the absence of the second.** Every
 * `avatar` in the product is `allow_null=True` and the API has always cleared
 * the column for a `null`, but there was no way to say `null` from any screen:
 * a file input can be *left alone* or *given a file*, and "take the picture
 * away" is neither. So a picked file and a pending removal are two separate
 * signals to the parent, `onPick` and `onRemove`, and they are mutually
 * exclusive here — picking a file cancels a pending removal, because sending
 * both would mean sending a `FormData`, and `lib/multipart.js` drops a `null`
 * out of a `FormData` rather than sending the string "null". The removal would
 * vanish silently and the file would win.
 */
export default function AvatarField({
  id,
  label,
  currentUrl,
  file,
  onPick,
  // Optional: a screen with nothing to remove — a brand-new group, say — simply
  // does not pass it, and no control is drawn.
  onRemove,
  removed = false,
  hint,
}) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A pending removal shows the empty square straight away. Waiting for the
  // save to answer would leave the picture on screen after the click, which
  // reads as "that did nothing" — the same complaint #104 was.
  const shown = preview ?? (removed ? null : currentUrl);
  const canRemove = Boolean(onRemove) && (removed || Boolean(currentUrl) || Boolean(file));

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase text-slate-400" htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-4">
        {shown ? (
          <img
            src={shown}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border-2 border-indigo-500 shrink-0" />
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
          className="min-w-0 text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
        />
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(!removed)}
            className="shrink-0 text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
          >
            {removed ? 'Keep' : 'Remove'}
          </button>
        )}
      </div>
      {removed && (
        <p className="text-xs text-amber-400">
          The image will be removed when you save.
        </p>
      )}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
