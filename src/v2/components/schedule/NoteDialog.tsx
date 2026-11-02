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

// The note's ink is written out at each use: Tailwind's JIT needs the literal
// in the class name, so a constant could not reach the markup anyway.

// A sheet of the note's paper: the textarea has to disappear into it.
const TEXTAREA =
  "min-h-[200px] w-full resize-y rounded-[2px] border border-[#1b1530]/25 bg-white/35 px-4 py-3 text-base text-[#1b1530] transition-colors outline-none placeholder:text-[#1b1530]/40 focus:border-[#1b1530]/55 disabled:opacity-60";

export default function NoteDialog({
  note,
  draftColor,
  canEdit,
  canDelete,
  onClose,
  onSubmit,
  onRecolour,
  onDelete,
}: {
  /** Null while composing a new note. */
  note: BoardNote | null;
  /** The colour a new note will be pinned up as; ignored once it exists. */
  draftColor?: NoteColor;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSubmit: (body: string, color: NoteColor) => Promise<NoteState>;
  onRecolour?: (color: NoteColor) => Promise<NoteState>;
  onDelete?: () => Promise<NoteState>;
}) {
  const [body, setBody] = useState(note?.body ?? "");
  // A note that exists wears its stored colour; a draft carries the one it
  // will be pinned up as, which the picker can change before it is.
  const [drafted, setDrafted] = useState<NoteColor>(draftColor ?? "butter");
  const color = note?.color ?? drafted;
  const skin = NOTE_STYLES[color];
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
        style={{ background: skin.background, borderColor: skin.borderColor }}
        className="flex max-h-[90dvh] max-w-[520px] flex-col gap-4 overflow-y-auto rounded-[2px] border px-7 py-7 shadow-[0_6px_24px_rgba(27,21,48,0.45)]"
      >
        <DialogTitle className={`${HEADING} text-[22px] text-[#1b1530]`}>
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
              className={`self-end text-xs ${over ? "text-meeple" : "text-[#1b1530]/50"}`}
            >
              {body.trim().length}/{NOTE_BODY_MAX}
            </span>
          </div>
        ) : (
          <p className="text-base break-words whitespace-pre-wrap text-[#1b1530]">
            {note?.body}
          </p>
        )}

        {note && (
          <p className="text-sm text-[#1b1530]/65">
            Pinned by {note.author.name}
          </p>
        )}

        {canEdit && (!note || onRecolour) && (
          <div className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.12em] text-[#1b1530]/60 uppercase">
              Colour
            </span>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  disabled={busy}
                  aria-label={swatch}
                  aria-pressed={color === swatch}
                  // A draft just repaints; a pinned note saves as it goes.
                  onClick={() =>
                    note && onRecolour
                      ? act(() => onRecolour(swatch), false)
                      : setDrafted(swatch)
                  }
                  style={{
                    ...NOTE_STYLES[swatch],
                    // The ring sits on the note's own paper, not a dark panel.
                    ...(color === swatch
                      ? { "--tw-ring-offset-color": skin.background }
                      : {}),
                  }}
                  className={`h-8 w-8 rounded-[2px] border transition-transform hover:-translate-y-px ${
                    color === swatch
                      ? "ring-2 ring-[#1b1530] ring-offset-2"
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
          <p aria-live="polite" className="text-sm text-[#1b1530]/65">
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
                    className="border-[#1b1530]/40 text-[#1b1530] hover:border-[#1b1530] hover:bg-[#1b1530]/10"
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
                  className="text-sm text-[#1b1530]/60 underline underline-offset-4 hover:text-[#1b1530]"
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
              className="border-[#1b1530]/40 text-[#1b1530] hover:border-[#1b1530] hover:bg-[#1b1530]/10"
              disabled={busy}
              onClick={onClose}
            >
              Close
            </Button>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="navy"
                disabled={busy || over || body.trim().length === 0}
                onClick={() => act(() => onSubmit(body, color), !note)}
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
