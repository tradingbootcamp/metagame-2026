"use client";

import { useState, useTransition } from "react";
import type { NoteState } from "@/app/(v2)/schedule/note-actions";
import {
  NOTE_BODY_MAX,
  NOTE_COLORS,
  type NoteColor,
  type BoardNote,
} from "@/lib/unconference";
import { Button } from "@/v2/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/v2/components/ui/dialog";
import { NOTE_STYLES } from "@/v2/lib/schedule-styles";
import { HEADING } from "../styles";

// The whole note: its full text, and for its author the pad of colours, the
// text to rewrite and the pin to pull out. Client state rather than a route,
// so a note needs no URL of its own.

// <Input>'s look, on a textarea.
const TEXTAREA =
  "min-h-[160px] w-full resize-y rounded-lg border-[1.5px] border-cream/25 bg-navy2 px-4 py-3 text-base text-cream transition-colors outline-none placeholder:text-cream/40 focus:border-tan disabled:opacity-60";

export default function NoteDialog({
  note,
  canEdit,
  canDelete,
  onClose,
  onSubmit,
  onRecolour,
  onDelete,
}: {
  /** Null while composing a new note. */
  note: BoardNote | null;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<NoteState>;
  onRecolour?: (color: NoteColor) => Promise<NoteState>;
  onDelete?: () => Promise<NoteState>;
}) {
  const [body, setBody] = useState(note?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const act = (run: () => Promise<NoteState>, close: boolean) =>
    start(async () => {
      setError(null);
      setSaved(false);
      const result = await run();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (close) onClose();
      else setSaved(true);
    });

  const over = body.trim().length > NOTE_BODY_MAX;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[90dvh] max-w-[520px] flex-col gap-4 overflow-y-auto px-7 py-7"
      >
        <DialogTitle className={`${HEADING} text-[22px] text-cream`}>
          {note ? "Note" : "Pin up a note"}
        </DialogTitle>

        {canEdit ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy}
              placeholder="What do you want to run, or hear about?"
              className={TEXTAREA}
            />
            <span
              className={`self-end text-xs ${over ? "text-meeple" : "text-cream/45"}`}
            >
              {body.trim().length}/{NOTE_BODY_MAX}
            </span>
          </div>
        ) : (
          <p className="text-base break-words whitespace-pre-wrap text-cream/90">
            {note?.body}
          </p>
        )}

        {note && (
          <p className="text-sm text-cream/60">Pinned by {note.author.name}</p>
        )}

        {note && onRecolour && canEdit && (
          <div className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.12em] text-cream/55 uppercase">
              Colour
            </span>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={busy}
                  aria-label={color}
                  aria-pressed={note.color === color}
                  onClick={() => act(() => onRecolour(color), false)}
                  style={NOTE_STYLES[color]}
                  className={`h-8 w-8 rounded-[3px] border-2 transition-transform hover:-translate-y-px ${
                    note.color === color
                      ? "ring-2 ring-cream ring-offset-2 ring-offset-navy"
                      : ""
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p aria-live="polite" className="text-sm text-meeple">
            {error}
          </p>
        )}
        {saved && !error && (
          <p aria-live="polite" className="text-sm text-cream/60">
            Saved.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canDelete &&
              onDelete &&
              (confirmDelete ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => act(onDelete, true)}
                  >
                    Take it down
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep it
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-cream/55 underline underline-offset-4 hover:text-cream"
                >
                  Delete
                </button>
              ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onClose}
            >
              Close
            </Button>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                disabled={busy || over || body.trim().length === 0}
                onClick={() => act(() => onSubmit(body), !note)}
              >
                {busy ? "Saving…" : note ? "Save" : "Pin it up"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
