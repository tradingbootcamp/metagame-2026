"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass, smallButtonClass } from "../ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

function snapshot(form: HTMLFormElement): string {
  return JSON.stringify(
    [...new FormData(form)].map(([k, v]) =>
      typeof v === "string" ? [k, v] : [k, v.name, v.size],
    ),
  );
}

/**
 * Asks before a dialog's form is closed with unsaved edits. Dirty means the
 * form's fields differ from when it mounted, or `extraDirty` for state the
 * form doesn't carry as fields. Attach `formRef` to the form.
 */
export function useUnsavedChanges(onClose: () => void, extraDirty = false) {
  const form = useRef<HTMLFormElement | null>(null);
  const initial = useRef<string | null>(null);
  const [asking, setAsking] = useState(false);

  // A callback ref: the dialog portals its content in after the first commit.
  const formRef = useCallback((el: HTMLFormElement | null) => {
    form.current = el;
    if (el && initial.current === null) initial.current = snapshot(el);
  }, []);

  const isDirty = () =>
    extraDirty ||
    (!!form.current &&
      initial.current !== null &&
      snapshot(form.current) !== initial.current);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  });

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current()) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  return {
    formRef,
    requestClose: () => (isDirty() ? setAsking(true) : onClose()),
    confirm: {
      open: asking,
      onKeepEditing: () => setAsking(false),
      onDiscard: () => {
        setAsking(false);
        onClose();
      },
      onSave: () => {
        setAsking(false);
        form.current?.requestSubmit();
      },
    },
  };
}

export function UnsavedChangesDialog({
  open,
  onKeepEditing,
  onDiscard,
  onSave,
}: ReturnType<typeof useUnsavedChanges>["confirm"]) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onKeepEditing()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[400px] border-line bg-white px-6 py-6 text-ink"
      >
        <DialogTitle className="font-bebas text-2xl tracking-wide text-navy">
          Unsaved changes
        </DialogTitle>
        <DialogDescription className="mt-1 mb-5 text-sm text-ink/60">
          Save your edits before closing?
        </DialogDescription>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onKeepEditing}
            className={smallButtonClass}
            autoFocus
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className={`${smallButtonClass} hover:border-meeple hover:text-meeple`}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`${buttonClass} w-auto`}
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
