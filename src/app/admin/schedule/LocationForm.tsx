"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { deleteLocation, saveLocation, type FormState } from "./actions";
import { buttonClass, fieldClass, smallButtonClass } from "../ui";
import type { ScheduleLocation } from "@/lib/schedule";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

function Field({
  label,
  name,
  state,
  children,
}: {
  label: string;
  name: string;
  state: FormState;
  children: React.ReactNode;
}) {
  const error = state.field === name ? state.error : null;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink/80">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-meeple">{error}</span>}
    </label>
  );
}

export default function LocationForm({
  location,
  onClose,
}: {
  location: ScheduleLocation | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveLocation,
    {},
  );
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  const generalError =
    state.error && !state.field ? state.error : (deleteError ?? null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[480px] border-line bg-white px-6 py-6 text-ink sm:px-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-md text-ink/40 transition-colors hover:text-ink"
        >
          <XIcon className="size-[18px]" />
        </button>
        <DialogTitle className="font-bebas text-2xl tracking-wide text-navy">
          {location ? "Edit room" : "New room"}
        </DialogTitle>
        <DialogDescription className="mt-1 mb-5 text-sm text-ink/60">
          Rooms are the grid’s columns, left to right by display order.
        </DialogDescription>

        <form action={formAction} className="grid gap-4">
          {location && <input type="hidden" name="id" value={location.id} />}

          <Field label="Name" name="name" state={state}>
            <input
              name="name"
              required
              defaultValue={location?.name ?? ""}
              className={fieldClass}
              autoFocus
            />
          </Field>

          <Field label="Where on campus" name="campusLocation" state={state}>
            <input
              name="campusLocation"
              defaultValue={location?.campusLocation ?? ""}
              placeholder="e.g. Upstairs, main building"
              className={fieldClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity" name="capacity" state={state}>
              <input
                name="capacity"
                inputMode="numeric"
                defaultValue={location?.capacity ?? ""}
                className={fieldClass}
              />
            </Field>
            <Field label="Display order" name="displayOrder" state={state}>
              <input
                name="displayOrder"
                inputMode="numeric"
                defaultValue={location?.displayOrder ?? 100}
                className={fieldClass}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="showInSchedule"
              defaultChecked={location?.showInSchedule ?? true}
              className="h-4 w-4 accent-navy"
            />
            Show on the public schedule
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {location &&
                (confirmDelete ? (
                  <>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() =>
                        startDelete(async () => {
                          const result = await deleteLocation(location.id);
                          if (result.error) setDeleteError(result.error);
                          else onClose();
                        })
                      }
                      className={`${smallButtonClass} border-meeple text-meeple hover:bg-meeple hover:text-white`}
                    >
                      {deleting ? "Deleting…" : "Yes, delete it"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className={smallButtonClass}
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    title="Sessions in this room keep their row and lose the room."
                    className={`${smallButtonClass} hover:border-meeple hover:text-meeple`}
                  >
                    Delete
                  </button>
                ))}
              {generalError && (
                <span className="text-sm text-meeple">{generalError}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={smallButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className={`${buttonClass} w-auto`}
              >
                {pending ? "Saving…" : location ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
