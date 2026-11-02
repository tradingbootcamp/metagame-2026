"use client";

import { XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

// The whole note, blown up: bare paper to write on, the pad of colours, and
// the pin to pull out. It saves itself — there is no button to press, the way
// there is none on a real post-it.

// The note's ink is written out at each use: Tailwind's JIT needs the literal
// in the class name, so a constant could not reach the markup anyway.

/** Quiet enough to type through, short enough that closing rarely races it. */
const AUTOSAVE_MS = 700;

// Bare paper. No border, no placeholder, no label — the sheet is the prompt.
const PAPER =
  "min-h-[220px] w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-[#1b1530] outline-none placeholder:text-transparent disabled:opacity-60";

export default function NoteDialog({
  note,
  draftColor,
  canEdit,
  canDelete,
  onClose,
  onSave,
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
  /** With no id, this is the first save and creates the note. */
  onSave: (
    body: string,
    color: NoteColor,
    id: string | null,
  ) => Promise<NoteState>;
  onRecolour: (id: string, color: NoteColor) => Promise<NoteState>;
  onDelete: (id: string) => Promise<NoteState>;
}) {
  const [body, setBody] = useState(note?.body ?? "");
  // The note this dialog is editing: the one it opened, or the one its first
  // save created. Without this, every keystroke after the first would pin up
  // another note.
  const [liveId, setLiveId] = useState<string | null>(note?.id ?? null);
  const [color, setColor] = useState<NoteColor>(
    note?.color ?? draftColor ?? "butter",
  );
  const skin = NOTE_STYLES[color];
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // What is on the sheet versus what the server has, so closing knows whether
  // there is anything left to write.
  const stored = useRef(note?.body ?? "");
  const latest = useRef(body);
  const inFlight = useRef(false);
  const idRef = useRef(liveId);
  // Mirrored in an effect rather than during render: a handler that fires
  // after the paint — a blur, a close — needs the newest of each.
  useEffect(() => {
    latest.current = body;
  }, [body]);
  useEffect(() => {
    idRef.current = liveId;
  }, [liveId]);

  const over = body.trim().length > NOTE_BODY_MAX;

  const save = useCallback(async () => {
    const text = latest.current.trim();
    // Nothing to pin up, and an empty body is refused by the column's own
    // check anyway — so a note emptied out keeps the words it had.
    if (!text || text === stored.current.trim() || inFlight.current) return;
    if (text.length > NOTE_BODY_MAX) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    const result = await onSave(latest.current, color, idRef.current);
    inFlight.current = false;
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    stored.current = latest.current;
    if (result.note && !idRef.current) {
      idRef.current = result.note.id;
      setLiveId(result.note.id);
    }
  }, [color, onSave]);

  // Typing settles, then it writes itself down.
  useEffect(() => {
    if (!canEdit) return;
    const t = setTimeout(save, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [body, canEdit, save]);

  /** Closing flushes whatever the debounce hasn't written yet. */
  function finish() {
    void save().finally(onClose);
  }

  const act = (run: () => Promise<NoteState>, close: boolean) => {
    setError(null);
    void (async () => {
      const result = await run();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (close) onClose();
    })();
  };

  // A note made in this dialog is the viewer's own, so it can be taken down
  // again before they have ever closed it.
  const removable = canDelete || (!!liveId && !note);

  return (
    <Dialog open onOpenChange={(open) => !open && finish()}>
      <DialogContent
        aria-describedby={undefined}
        // Its own, because here the X takes the note off the board rather
        // than dismissing the dialog — Done is what puts it away.
        showCloseButton={false}
        style={{ background: skin.background, borderColor: skin.borderColor }}
        className="flex max-h-[90dvh] max-w-[520px] flex-col gap-4 overflow-y-auto rounded-[2px] border px-7 py-7 shadow-[0_6px_24px_rgba(27,21,48,0.45)]"
      >
        <button
          type="button"
          // Nothing pinned up yet, or not the viewer's to take down: then it
          // is only a way out, and an X that did nothing would be worse.
          aria-label={removable && liveId ? "Take this note down" : "Close"}
          onClick={() =>
            removable && liveId ? setConfirmDelete(true) : finish()
          }
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-md text-[#1b1530]/45 transition-colors outline-none hover:bg-[#1b1530]/10 hover:text-[#1b1530] focus-visible:ring-2 focus-visible:ring-[#1b1530]/40"
        >
          <XIcon className="size-[18px]" />
        </button>
        {/* The sheet is the prompt; the title is for screen readers only. */}
        <DialogTitle className="sr-only">
          {note ? "Note" : "A new note"}
        </DialogTitle>

        {canEdit ? (
          <textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => void save()}
            aria-label="Note"
            className={PAPER}
          />
        ) : (
          <p className="text-base break-words whitespace-pre-wrap text-[#1b1530]">
            {note?.body}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 text-sm text-[#1b1530]/65">
          <span>{note ? `Pinned by ${note.author.name}` : ""}</span>
          <span aria-live="polite" className="text-xs">
            {error ? (
              <span className="text-meeple">{error}</span>
            ) : over ? (
              <span className="text-meeple">
                {body.trim().length}/{NOTE_BODY_MAX}
              </span>
            ) : saving ? (
              "Saving…"
            ) : (
              ""
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {canEdit &&
              NOTE_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={swatch}
                  aria-pressed={color === swatch}
                  // Repaints at once; writes only once there is a note to write to.
                  onClick={() => {
                    setColor(swatch);
                    if (liveId) act(() => onRecolour(liveId, swatch), false);
                  }}
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
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => liveId && act(() => onDelete(liveId), true)}
              >
                Take it down
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border-[#1b1530]/40 text-[#1b1530] hover:border-[#1b1530] hover:bg-[#1b1530]/10"
                onClick={() => setConfirmDelete(false)}
              >
                Keep it
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="border-[#1b1530]/40 text-[#1b1530] hover:border-[#1b1530] hover:bg-[#1b1530]/10"
              onClick={finish}
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
