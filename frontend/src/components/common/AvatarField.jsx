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
 */
export default function AvatarField({ id, label, currentUrl, file, onPick, hint }) {
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

  const shown = preview ?? currentUrl;

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
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
