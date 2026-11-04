"use client";

import { PencilIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NoteState } from "@/app/(v2)/schedule/note-actions";
import {
  bannerSize,
  PAPER_HEX,
  type NoticeDoc,
  type Paper,
} from "@/lib/notice-doc";
import {
  durationMinutes,
  formatPacificTime,
  heightPx,
  offsetPx,
  type PublicSession,
} from "@/lib/schedule";
import type { BoardNote, PosterSession } from "@/lib/unconference";
import { useSessionHref } from "../SessionModalHost";
import NoticeCanvas from "./NoticeCanvas";
import { PosterPaper } from "./Paper";
import SessionPosterEditor from "./SessionPosterEditor";
import { useMeasuredSize } from "./useNoticeEditor";

// Session posters: the team's notices for sessions on the board's days.
// Each spans the board's width at its session's own time rows, over every
// sticky, and opens the session rather than a poster of its own.

/** Room either side for the tape, which hangs past the poster's corners. */
const SIDE = 14;

const timeRange = (from: string, to: string) =>
  `${formatPacificTime(from)}–${formatPacificTime(to)}`;

/** A session poster always comes with its design; the board draws it. */
export type SessionPoster = BoardNote & {
  session: PosterSession;
  poster: NoticeDoc;
};

/** A design made in the editor, scaled to fit the poster without cropping. */
function Designed({ note }: { note: SessionPoster }) {
  const [measure, box] = useMeasuredSize();
  const size = bannerSize(durationMinutes(note.session));
  const width = Math.min(box.w, (box.h * size.w) / size.h);
  return (
    <div ref={measure} className="flex h-full items-center justify-center">
      {width > 0 && (
        <NoticeCanvas
          face="banner"
          size={size}
          doc={note.poster}
          width={width}
        />
      )}
    </div>
  );
}

function Poster({
  note,
  firstSlot,
  canManage,
  onTakeDown,
  onEdit,
}: {
  note: SessionPoster;
  firstSlot: number;
  canManage: boolean;
  onTakeDown: () => void;
  onEdit: () => void;
}) {
  const href = useSessionHref();
  const [confirming, setConfirming] = useState(false);
  const s = note.session;
  const top = offsetPx(s, firstSlot);
  const height = heightPx(s);
  // Short sessions get a poster with just the title and time.
  const roomy = height >= 150;
  const designed = note.poster.items.length > 0;
  const paper = designed
    ? PAPER_HEX[(note.poster.paper ?? "white") as Paper]
    : "#fffdf8";
  return (
    <div
      style={{ top: top + 6, height: height - 12, left: SIDE, right: SIDE }}
      className="pointer-events-auto absolute"
    >
      <PosterPaper paper={paper} className="h-full">
        {designed ? (
          <Link
            href={href(s.slug)}
            scroll={false}
            aria-label={`${s.title}: see the session`}
            className="block h-full overflow-hidden transition-colors hover:bg-[#1b1530]/[0.03]"
          >
            <Designed note={note} />
          </Link>
        ) : (
          <Link
            href={href(s.slug)}
            scroll={false}
            className="flex h-full flex-col items-center justify-center gap-1 overflow-hidden px-3 py-2 text-center text-[#1b1530] transition-colors hover:bg-[#1b1530]/[0.03]"
          >
            <span className="text-[10px] font-bold tracking-[0.18em] text-[#d6405f] uppercase">
              {timeRange(s.startsAt, s.endsAt)}
            </span>
            <span className="font-[family-name:var(--font-bebas)] text-[34px] leading-[0.95] tracking-wide sm:text-[40px]">
              {s.title}
            </span>
            {roomy && s.hosts.length > 0 && (
              <span className="text-xs font-semibold text-[#1b1530]/70">
                with {s.hosts.join(", ")}
              </span>
            )}
            {roomy && s.description && (
              <span className="line-clamp-3 max-w-[32ch] text-xs leading-snug text-[#1b1530]/70">
                {s.description}
              </span>
            )}
            <span className="mt-1 text-[10px] font-semibold text-[#3f6fd1] underline underline-offset-2">
              See the session
            </span>
          </Link>
        )}
      </PosterPaper>
      {canManage && (
        <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
          {!confirming && (
            <button
              type="button"
              aria-label={`Edit the ${s.title} poster`}
              title="Edit this poster"
              onClick={onEdit}
              className="rounded-full bg-cream/90 p-0.5 text-[#1b1530]/50 ring-1 ring-[#1b1530]/15 hover:text-[#3f6fd1]"
            >
              <PencilIcon className="size-3.5" />
            </button>
          )}
          {confirming ? (
            <>
              <button
                type="button"
                onClick={onTakeDown}
                className="rounded bg-[#c02f4e] px-1.5 py-0.5 text-[10px] font-bold text-cream"
              >
                Take down
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded bg-cream px-1.5 py-0.5 text-[10px] font-semibold text-[#1b1530] ring-1 ring-[#1b1530]/20"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label={`Take the ${s.title} poster down`}
              title="Take this poster down"
              onClick={() => setConfirming(true)}
              className="rounded-full bg-cream/90 p-0.5 text-[#1b1530]/50 ring-1 ring-[#1b1530]/15 hover:text-[#c02f4e]"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The posters on one day's board, positioned from the grid's own first slot
 * so each lines up with its session's rows. Sits over the whole board,
 * stickies included; only the posters themselves take clicks.
 */
export function SessionPosterLayer({
  notes,
  firstSlot,
  sessions,
  canManage,
  onTakeDown,
  onSave,
}: {
  notes: BoardNote[];
  firstSlot: number;
  /** The day's sessions, for re-linking a poster in the editor. */
  sessions: PublicSession[];
  /** The schedule team: may edit and take posters down. */
  canManage: boolean;
  onTakeDown: (noteId: string) => void;
  onSave: (
    noteId: string,
    input: { poster: NoticeDoc; sessionId: string },
  ) => Promise<NoteState>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const posters = notes.filter(
    (n): n is SessionPoster => n.session !== null && n.poster !== null,
  );
  const open = posters.find((p) => p.id === editing);
  if (posters.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {posters.map((note) => (
        <Poster
          key={note.id}
          note={note}
          firstSlot={firstSlot}
          canManage={canManage}
          onTakeDown={() => onTakeDown(note.id)}
          onEdit={() => setEditing(note.id)}
        />
      ))}
      {open && (
        <SessionPosterEditor
          key={open.id}
          note={open}
          sessions={sessions}
          taken={
            new Set(posters.filter((p) => p !== open).map((p) => p.session.id))
          }
          onSave={(input) => onSave(open.id, input)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** The team's "+ Session poster": pick one of the day's sessions. */
export function SessionPosterPicker({
  sessions,
  locationId,
  taken,
  onPick,
}: {
  sessions: PublicSession[];
  /** The board's room, whose sessions are listed first. */
  locationId: string;
  /** Sessions that already have a poster. */
  taken: ReadonlySet<string>;
  onPick: (sessionId: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choices = sessions
    .filter((s) => !taken.has(s.id))
    .sort(
      (a, b) =>
        Number(b.locationId === locationId) -
          Number(a.locationId === locationId) ||
        a.startsAt.localeCompare(b.startsAt),
    );

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-[3px] border border-[#1b1530]/30 bg-cream px-2 py-0.5 font-semibold text-[#1b1530] hover:bg-white"
      >
        + Session poster
      </button>
      {open && (
        <div className="absolute top-full left-0 z-40 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border-[1.5px] border-[#1b1530]/20 bg-cream p-1 shadow-xl">
          {choices.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[#1b1530]/55">
              Every session this day already has a poster.
            </p>
          ) : (
            choices.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy(s.id);
                  await onPick(s.id);
                  setBusy(null);
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-[#1b1530]/[0.06] disabled:opacity-50"
              >
                <span className="text-[11px] text-[#1b1530]/55">
                  {timeRange(s.startsAt, s.endsAt)}
                  {s.locationId === locationId && " · this room"}
                </span>
                <span className="text-xs leading-snug font-semibold text-[#1b1530]">
                  {busy === s.id ? "Pinning…" : s.title}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
