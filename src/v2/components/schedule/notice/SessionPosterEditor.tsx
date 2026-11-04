"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import type { NoteState } from "@/app/(v2)/schedule/note-actions";
import {
  bannerSize,
  isBlank,
  PAPER_HEX,
  recolourBox,
  textDoc,
  type Ink,
  type NoticeDoc,
  type Paper,
} from "@/lib/notice-doc";
import {
  durationMinutes,
  formatPacificTime,
  type PublicSession,
} from "@/lib/schedule";
import type { PosterSession } from "@/lib/unconference";
import { Dialog, DialogContent, DialogTitle } from "@/v2/components/ui/dialog";
import NoticeCanvas from "./NoticeCanvas";
import NoticeToolbar from "./NoticeToolbar";
import { PosterPaper } from "./Paper";
import type { SessionPoster } from "./SessionPosters";
import {
  useMeasuredSize,
  useNoticeTools,
  useUndoable,
} from "./useNoticeEditor";

// The schedule team's editor for a session poster: the same tools as a
// notice's poster, on a canvas the shape the poster takes on the board, and
// a choice of which session it stands for.

/** The poster as it starts out: the session's details, ready to rework. */
export function draftFromSession(s: PosterSession): NoticeDoc {
  const { w } = bannerSize(durationMinutes(s));
  return textDoc(
    "banner",
    [
      {
        text: `${formatPacificTime(s.startsAt)}–${formatPacificTime(s.endsAt)}`,
        size: "s",
        bold: true,
      },
      { text: s.title, size: "xl", bold: true },
      ...(s.hosts.length ? [{ text: `with ${s.hosts.join(", ")}` }] : []),
      ...(s.description ? [{ text: "" }, { text: s.description }] : []),
    ],
    { x: 18, y: 18, w: w - 36 },
    "white",
  );
}

export default function SessionPosterEditor({
  note,
  sessions,
  taken,
  onSave,
  onClose,
}: {
  note: SessionPoster;
  /** The day's sessions it could stand for. */
  sessions: PublicSession[];
  /** Sessions that already have a poster, this one's own aside. */
  taken: ReadonlySet<string>;
  onSave: (input: {
    poster: NoticeDoc;
    sessionId: string;
  }) => Promise<NoteState>;
  onClose: () => void;
}) {
  const { draft, draftRef, commit, reload, undo, canUndo, resetKey } =
    useUndoable<NoticeDoc>(
      note.poster.items.length > 0
        ? note.poster
        : draftFromSession(note.session),
    );
  const tools = useNoticeTools();
  const [sessionId, setSessionId] = useState(note.session.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const picked = sessions.find((s) => s.id === sessionId);
  const linked: PosterSession = picked
    ? {
        id: picked.id,
        slug: picked.slug,
        title: picked.title,
        description: picked.description,
        startsAt: picked.startsAt,
        endsAt: picked.endsAt,
        hosts: picked.hosts.map((h) => h.name),
      }
    : note.session;
  const size = bannerSize(durationMinutes(linked));

  function pickInk(i: Ink) {
    tools.setInk(i);
    // A focused text box takes the colour too.
    if (tools.activeText) {
      commit(recolourBox(draftRef.current, tools.activeText.id, i));
    }
  }

  // As wide as the dialog allows, up to a comfortable editing size.
  const [body, room] = useMeasuredSize();
  const canvasW = Math.max(220, Math.min(420, room.w - 40));
  const paper = (draft.paper ?? "white") as Paper;

  async function save() {
    setSaving(true);
    setError(null);
    // A blank page means the design drawn from the session's details.
    const poster = isBlank(draft) ? { v: 1 as const, items: [] } : draft;
    const result = await onSave({ poster, sessionId });
    setSaving(false);
    if (result.error) setError(result.error);
    else onClose();
  }

  const choices = sessions.filter(
    (s) => s.id === note.session.id || !taken.has(s.id),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[94dvh] max-w-[620px] overflow-y-auto border-[#1b1530]/20 bg-[#ece2cb] p-0 text-[#1b1530]"
      >
        <DialogTitle className="sr-only">Edit session poster</DialogTitle>
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-[#ece2cb]/95 px-3 py-2 backdrop-blur-sm">
          <NoticeToolbar
            face="poster"
            tool={tools.tool}
            onTool={tools.pickTool}
            ink={tools.ink}
            onInk={pickInk}
            width={tools.width}
            onWidth={tools.setWidth}
            textSize={tools.textSize}
            onTextSize={tools.setTextSize}
            activeText={tools.activeEditable}
            color="butter"
            onColor={() => {}}
            paper={paper}
            onPaper={(p) => commit({ ...draftRef.current, paper: p })}
            canUndo={canUndo}
            onUndo={() => {
              if (undo()) tools.setActiveText(null);
            }}
          />
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-auto flex size-8 items-center justify-center rounded-md text-[#1b1530]/55 hover:bg-[#1b1530]/10 hover:text-[#1b1530]"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div ref={body} className="flex flex-col gap-4 px-4 pt-3 pb-5">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Links to session
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="rounded-md border-[1.5px] border-[#1b1530]/25 bg-cream px-2 py-1.5 text-sm font-normal"
            >
              {choices.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatPacificTime(s.startsAt)}–{formatPacificTime(s.endsAt)}{" "}
                  · {s.title}
                </option>
              ))}
            </select>
            <span className="font-normal text-[#1b1530]/55">
              The poster sits at this session’s time on the board, as tall as it
              runs, and opens it when clicked.
            </span>
          </label>

          {room.w > 0 && (
            <div className="flex justify-center py-3">
              <PosterPaper paper={PAPER_HEX[paper]}>
                <NoticeCanvas
                  face="banner"
                  size={size}
                  doc={draft}
                  width={canvasW}
                  editing={{
                    tool: tools.tool,
                    ink: tools.ink,
                    width: tools.width,
                    textSize: tools.textSize,
                    resetKey,
                    active: true,
                    onActivate: () => {},
                    onChange: commit,
                    onFocusText: (el, id) =>
                      tools.setActiveText(el && id ? { el, id } : null),
                  }}
                />
              </PosterPaper>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-md border-[1.5px] border-[#1b1530] bg-[#1b1530] px-3 py-1.5 text-xs font-bold text-cream hover:bg-[#2c2350] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save poster"}
            </button>
            <button
              type="button"
              onClick={() => reload(draftFromSession(linked))}
              className="rounded-md border-[1.5px] border-[#1b1530]/30 bg-cream px-3 py-1.5 text-xs font-semibold hover:bg-white"
            >
              Start over from the session’s details
            </button>
            {error && (
              <span role="status" className="text-xs text-[#c02f4e]">
                {error}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
