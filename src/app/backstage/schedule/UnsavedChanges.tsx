"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * The form's named fields, plus whatever is typed into unnamed ones (e.g. the
 * account search boxes), which FormData doesn't carry.
 */
function snapshot(form: HTMLFormElement): string {
  const unnamed = [...form.elements]
    .filter(
      (el): el is Field =>
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement) &&
        !el.name &&
        el.value !== "",
    )
    .map((el) => el.value);
  return JSON.stringify([[...new FormData(form)], unnamed]);
}

/**
 * Asks before a dialog's form is closed with unsaved edits. Dirty means the
 * form differs from when it mounted, or `extraDirty` for state the form
 * doesn't carry as fields. Pass `formRef` as the form's ref.
 */
export function useUnsavedChanges({
  onClose,
  pending,
  extraDirty = false,
}: {
  onClose: () => void;
  /** A save is in flight: closing waits for it rather than racing it. */
  pending: boolean;
  extraDirty?: boolean;
}) {
  // State rather than a ref: the dialog portals its content in after the
  // first commit, and the snapshot has to wait for the form to exist.
  const [form, formRef] = useState<HTMLFormElement | null>(null);
  const initial = useRef<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [saveQueued, setSaveQueued] = useState(false);

  useEffect(() => {
    if (form && initial.current === null) initial.current = snapshot(form);
  }, [form]);

  const isDirty = () =>
    extraDirty ||
    (!!form && initial.current !== null && snapshot(form) !== initial.current);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  });

  return {
    form,
    formRef,
    requestClose: () => {
      if (pending) return;
      if (isDirty()) setAsking(true);
      else onClose();
    },
    confirm: {
      open: asking,
      pending,
      onKeepEditing: () => setAsking(false),
      onDiscard: () => {
        setAsking(false);
        onClose();
      },
      // Submitted once the prompt has closed, so native validation can focus
      // the invalid field instead of being trapped behind the prompt.
      onSave: () => {
        setSaveQueued(true);
        setAsking(false);
      },
      onClosed: saveQueued
        ? () => {
            setSaveQueued(false);
            form?.requestSubmit();
          }
        : undefined,
    },
  };
}

export function UnsavedChangesDialog({
  open,
  pending,
  onKeepEditing,
  onDiscard,
  onSave,
  onClosed,
}: ReturnType<typeof useUnsavedChanges>["confirm"]) {
  return (
    <ConfirmDialog
      open={open}
      title="Unsaved changes"
      onDismiss={onKeepEditing}
      onClosed={onClosed}
      actions={[
        { label: "Keep editing", onClick: onKeepEditing },
        { label: "Discard", onClick: onDiscard, disabled: pending },
        { label: "Save", onClick: onSave, primary: true, disabled: pending },
      ]}
    >
      Save your edits before closing?
    </ConfirmDialog>
  );
}
