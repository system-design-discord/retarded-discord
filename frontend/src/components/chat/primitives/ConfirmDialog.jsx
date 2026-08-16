import { useCallback, useEffect, useRef, useState } from 'react';

// The in-app replacement for `window.confirm` — #139.
//
// Four screens confirmed a destructive act with the browser's native dialog:
// deleting a channel, removing a group member, deleting a group and cancelling
// a scheduled message. It worked, and the server re-checked the permission
// regardless, so this is polish rather than a defect — but the native dialog
// **blocks the main thread**, and three of those four screens hold an open
// WebSocket while it is up, so every frame the gateway pushes is queued instead
// of rendered. It also cannot be styled, which matters here because the copy is
// the point: deleting a channel takes its topics, memberships, roles and every
// message with it, and that sentence deserves the same visual weight as the
// danger zone in `GroupSettings`.
//
// **One component and one hook, not four modals.** `useConfirm` answers a
// promise of `true`/`false`, so a call site keeps the shape it already had:
//
//     const [confirm, confirmDialog] = useConfirm();
//     …
//     if (!(await confirm({ title, body, confirmLabel }))) return;
//     …
//     return (<>{page}{confirmDialog}</>);
//
// That is a swap at each site rather than a rewrite of each handler, which is
// the whole reason the promise shape was chosen over a callback prop.
//
// **The dialog decides nothing.** `roles` is the authority
// (`architecture.tex` §5.1) and the API refuses whatever the UI drew; this
// confirms an intention and grants no permission. If you are about to give it a
// `canDelete` prop, you are about to move a decision into the wrong module.
//
// Escape and a backdrop click both mean cancel, and focus opens on **Cancel**,
// never on the destructive button — a dialog that appears under a keystroke
// already in flight must not turn that keystroke into a deletion.

const TONES = {
  danger: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20',
  primary: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20',
};

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  // Opening focuses Cancel, so Enter on a dialog nobody has read yet does the
  // harmless thing.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    // `p-4` and `max-h`/`overflow-y` are what keep this inside a 390px viewport
    // (U-13's rule) when the body runs to three lines.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* The backdrop is a real button rather than a `<div onClick>`: the
          `jsx-a11y` rules #106 turned on reject the second one, and rightly —
          a click handler on a non-interactive element is invisible to a
          keyboard. It is `aria-hidden` and untabbable because it is not an
          eighth control, it is the mouse shorthand for Escape, which the
          handler above already serves. A sibling of the card rather than its
          parent, so no `stopPropagation` is needed to keep a click inside the
          dialog from dismissing it. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-default"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <h2 className="text-lg font-extrabold text-white">{title}</h2>
        {body && <p className="text-sm text-slate-400 leading-relaxed">{body}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-lg cursor-pointer ${
              TONES[tone] ?? TONES.danger
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * `[confirm, dialog]` — call `confirm(options)`, render `dialog`.
 *
 * `confirm` answers a promise that resolves `true` when the destructive button
 * is pressed and `false` for every way out: Cancel, Escape, the backdrop. It
 * never rejects, so a call site is `if (!(await confirm(…))) return;` and
 * nothing needs a `try`.
 *
 * The resolver is held in a ref rather than in state because settling the
 * promise must not depend on a re-render having happened first.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolveRef = useRef(null);

  const settle = useCallback((answer) => {
    setRequest(null);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(answer);
  }, []);

  const confirm = useCallback((options) => {
    // A second request while one is open would strand the first promise
    // unresolved, and its caller would wait forever. Cancel it first.
    resolveRef.current?.(false);
    setRequest(options);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={request !== null}
      {...request}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return [confirm, dialog];
}
