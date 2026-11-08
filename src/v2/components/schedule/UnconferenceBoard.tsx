"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { PublicSession } from "@/lib/schedule";
import {
  clampNotePosition,
  firstFreeSpot,
  notesInPaintOrder,
  type BoardNote,
} from "@/lib/unconference";
import { NEEDS_TICKET_HINT, useNoteBoard } from "./NoteBoard";
import NoticeCanvas from "./notice/NoticeCanvas";
import { StickyPaper, tiltFor } from "./notice/Paper";
import { ReactionPills } from "./notice/Reactions";
import {
  SessionPosterLayer,
  SessionPosterPicker,
} from "./notice/SessionPosters";
import { EmptyPanel, ROW, SessionRows } from "./ScheduleViews";

// The bulletin board a "board" room's column is drawn as: a cork board in a
// wooden frame, with each notice's sticky note wherever its fractions put it,
// the newest on top. A mouse drags them around; everything else taps one
// open into its poster.

/** Every sticky note is the same size; the poster is what shows the rest. */
export const TILE_PX = 108;

// Cork: a warm base with two scales of speckle, all CSS so nothing to load.
const CORK: React.CSSProperties = {
  backgroundColor: "#c99a62",
  backgroundImage: [
    "radial-gradient(rgba(92,54,22,0.35) 1px, transparent 1.5px)",
    "radial-gradient(rgba(255,236,200,0.35) 1px, transparent 1.5px)",
    "radial-gradient(rgba(92,54,22,0.18) 2px, transparent 2.5px)",
  ].join(","),
  backgroundSize: "9px 9px, 13px 13px, 23px 23px",
  backgroundPosition: "0 0, 5px 7px, 11px 3px",
};

/** A drag has to beat this many pixels before it counts as one. */
const DRAG_SLOP = 3;

/**
 * The width of the board at its narrowest, for placing a note with no
 * surface to measure: list view draws no board, and the notes it pins up land
 * on one this wide. It is the --board-w token GridDay sets on a phone; a
 * bigger guess would put notes on top of each other there.
 */
const BOARD_MIN_W = 232;

/** A note's height with its row of reaction pills, so they stay on the cork. */
const NOTE_H = TILE_PX + 14;

/**
 * A fraction of the board as a CSS offset that keeps the whole tile on it:
 * at 0 the tile's left edge sits on the board's, at 1 its right edge does.
 * The board is 1fr-fluid, so this is done in CSS rather than from a measured
 * rect — nothing here has to re-measure on resize.
 */
const offset = (fraction: number, tile: number): string =>
  `calc(${fraction * 100}% - ${fraction * tile}px)`;

// A pin, as the cursor, hotspot on its point. Inline so there is no asset to
// ship or 404. Written with plain "#": encodeURIComponent escapes it once,
// and pre-escaping it here would double-encode into a string no browser
// reads as a colour. The pale outer stroke keeps it legible on cork and on
// any of the six papers.
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
<g fill="none" stroke="#fdf6e8" stroke-width="3.5" stroke-linecap="round"><path d="M5 23 L13 15"/><circle cx="17.5" cy="10.5" r="6"/></g>
<path d="M5 23 L13 15" stroke="#1b1530" stroke-width="1.75" stroke-linecap="round"/>
<circle cx="17.5" cy="10.5" r="6" fill="#e0607f" stroke="#1b1530" stroke-width="1.5"/>
<circle cx="15.4" cy="8.4" r="1.7" fill="#ffffff" opacity="0.85"/>
</svg>`;

const PIN_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  PIN_SVG,
)}") 5 23, crosshair`;

/** How long the pin rests before the board offers to take a note there. */
const DWELL_MS = 450;

const BAR =
  "flex items-center gap-2 border-b-2 border-[#1b1530]/25 bg-[#f4ecd2] px-2 py-1.5 text-[11px]";
const HINT_LINK = "underline underline-offset-2 hover:text-[#1b1530]";

/**
 * Why this viewer can't pin a note up, and where to go about it. Signed out
 * and ticketless are different problems, and the board knows which it is.
 */
function PostHint({ className }: { className: string }) {
  const board = useNoteBoard();
  return (
    <span className={className}>
      {board.readOnly ? (
        <>
          <Link href="/schedule" className={HINT_LINK}>
            Open the full schedule
          </Link>{" "}
          to pin a note up or react.
        </>
      ) : board.signedIn ? (
        <>
          {NEEDS_TICKET_HINT}{" "}
          <Link href="/account?tab=tickets" className={HINT_LINK}>
            Claim yours
          </Link>
        </>
      ) : (
        <>
          <Link href="/login?next=%2Fschedule" className={HINT_LINK}>
            Sign in
          </Link>{" "}
          to pin a note up.
        </>
      )}
    </span>
  );
}
const ADD =
  "rounded-[3px] border border-[#1b1530]/30 bg-[#f4ecd2]/80 px-2 py-1 font-semibold text-[#1b1530] transition-colors hover:bg-[#f4ecd2] disabled:opacity-60";

type Drag = {
  noteId: string;
  /** Where inside the tile it was taken hold of. */
  dx: number;
  dy: number;
  /** The pointer's own starting point, for the slop test. */
  origin: { x: number; y: number };
  /** Where the note was, to fall back on if the board can't be measured. */
  from: { x: number; y: number };
  moved: boolean;
};

/** One day's board: its own notes, at whatever height that day gives it. */
export default function UnconferenceBoard({
  locationId,
  dayKey,
  firstSlot,
  sessions,
}: {
  locationId: string;
  dayKey: string;
  /** The day's first grid slot, in minutes, so posters line up with rows. */
  firstSlot: number;
  /** The day's sessions, for the team's session poster picker. */
  sessions: PublicSession[];
}) {
  const board = useNoteBoard();
  const all = board.notesIn(locationId, dayKey);
  const notes = all.filter((n) => !n.session);
  const team = board.isTeam && !board.readOnly;
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // Where the note under the pointer is right now. Local, not board state:
  // the provider wraps the whole schedule, so a setState per pointermove
  // would re-render every session block in the grid behind it.
  const [sliding, setSliding] = useState<{
    noteId: string;
    x: number;
    y: number;
  } | null>(null);
  // Set by the drag that just ended, so the click it is followed by doesn't
  // also open the note.
  const dragged = useRef(false);

  // A drag that ends with the component gone would leave the cursor stuck.
  useEffect(() => () => document.body.classList.remove("cursor-grabbing"), []);

  const fractionAt = (clientX: number, clientY: number, d: Drag) => {
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return d.from;
    // The tile's own size is the part of the board its corner can't reach,
    // which is exactly what `offset` takes out again.
    const spanX = rect.width - TILE_PX;
    const spanY = rect.height - NOTE_H;
    return clampNotePosition(
      spanX > 0 ? (clientX - rect.left - d.dx) / spanX : 0,
      spanY > 0 ? (clientY - rect.top - d.dy) / spanY : 0,
    );
  };

  // Mouse only, and only its primary button. Touch and pen never reach the
  // drag at all — the test is an allowlist, so an unrecognised pointerType
  // falls through to tap-to-open rather than into a drag that would fight
  // the grid's horizontal scroll. Nothing here sets touch-action either.
  function grab(e: ReactPointerEvent<HTMLButtonElement>, note: BoardNote) {
    dragged.current = false;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (!board.canMove(note)) return;
    // Measured from the note's unrotated spot on the cork, not the tilted
    // tile's bounding box, or the note jumps when the drag begins.
    const cork = surface.current?.getBoundingClientRect();
    if (!cork) return;
    drag.current = {
      noteId: note.id,
      dx: e.clientX - cork.left - (cork.width - TILE_PX) * note.x,
      dy: e.clientY - cork.top - (cork.height - NOTE_H) * note.y,
      origin: { x: e.clientX, y: e.clientY },
      from: { x: note.x, y: note.y },
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function slide(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      const far =
        Math.abs(e.clientX - d.origin.x) + Math.abs(e.clientY - d.origin.y);
      if (far < DRAG_SLOP) return;
      d.moved = true;
      document.body.classList.add("cursor-grabbing");
    }
    const at = fractionAt(e.clientX, e.clientY, d);
    setSliding({ noteId: d.noteId, ...at });
  }

  function release(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    drag.current = null;
    document.body.classList.remove("cursor-grabbing");
    if (!d?.moved) return;
    dragged.current = true;
    const at = fractionAt(e.clientX, e.clientY, d);
    // Handing it over in the same batch as the local drop, so the tile never
    // flicks back to where it started on the way.
    setSliding(null);
    board.commit(d.noteId, at.x, at.y);
  }

  // Capture can end without a pointerup — the window loses focus mid-drag.
  // There is no trustworthy position to save then, so the note goes back to
  // wherever the server has it.
  function abandon() {
    if (!drag.current) return;
    drag.current = null;
    setSliding(null);
    document.body.classList.remove("cursor-grabbing");
  }

  // Where the pin is resting, in board pixels, once it has been still long
  // enough to mean it. Mouse only: a touch has no hover to read.
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [resting, setResting] = useState(false);
  const dwell = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `sliding`, not the drag ref: a ref read during render is off-limits, and
  // a note under capture keeps these handlers from firing anyway.
  // A note being re-placed by tap waits for a tap on its own board.
  const placing = notes.some((n) => n.id === board.moving);
  const pinnable = (board.canPost || placing) && !sliding;

  const stopDwell = () => {
    if (dwell.current) clearTimeout(dwell.current);
    dwell.current = null;
  };
  useEffect(() => stopDwell, []);

  function trackPin(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !pinnable) return;
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return;
    setPin({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setResting(false);
    stopDwell();
    dwell.current = setTimeout(() => setResting(true), DWELL_MS);
  }

  function dropPin() {
    stopDwell();
    setPin(null);
    setResting(false);
  }

  /** A click on bare cork pins a note where the point was, not anywhere. */
  function pinHere(e: React.MouseEvent) {
    // Only the cork itself: a click on a note is that note's to handle.
    if (e.target !== e.currentTarget || !pinnable) return;
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return;
    const spanX = rect.width - TILE_PX;
    const spanY = rect.height - NOTE_H;
    // The point lands where the pin was, so the tile hangs below and right of
    // it the way a real one would.
    const spot = clampNotePosition(
      spanX > 0 ? (e.clientX - rect.left) / spanX : 0,
      spanY > 0 ? (e.clientY - rect.top) / spanY : 0,
    );
    if (placing && board.moving) {
      board.commit(board.moving, spot.x, spot.y);
      board.cancelMove();
    } else {
      board.compose(locationId, dayKey, spot);
    }
    dropPin();
  }

  return (
    <div className="absolute inset-0">
      {/* The frame: a wooden border with a dark ink outline, clipart-style. */}
      <div className="absolute inset-0 flex flex-col overflow-hidden border-[7px] border-[#9a6430] shadow-[inset_0_0_0_2px_#1b1530,inset_3px_4px_0_8px_rgba(27,21,48,0.18)] outline-2 -outline-offset-2 outline-[#1b1530]">
        {/* No button for notes: one goes up where the pin is. The bar tells
          someone without a ticket why they can't, and holds the schedule
          team's session poster picker. */}
        {(!board.canPost || team) && (
          <div className={BAR}>
            {!board.canPost && <PostHint className="text-[#1b1530]/55" />}
            {team && (
              <SessionPosterPicker
                sessions={sessions}
                locationId={locationId}
                taken={
                  new Set(all.flatMap((n) => (n.session ? [n.session.id] : [])))
                }
                onPick={(sessionId) => board.pinSession(locationId, sessionId)}
              />
            )}
          </div>
        )}
        <div
          ref={surface}
          onPointerMove={trackPin}
          onPointerLeave={dropPin}
          onClick={pinHere}
          style={{ ...CORK, ...(pinnable && { cursor: PIN_CURSOR }) }}
          className="relative min-h-0 flex-1 shadow-[inset_2px_3px_6px_rgba(27,21,48,0.35)]"
        >
          <>
            {notes.length === 0 && (
              <p className="pointer-events-none mx-auto mt-4 w-fit rounded-[3px] border-[1.5px] border-[#1b1530]/40 bg-cream/90 px-2 py-1 text-center text-[11px] text-[#1b1530]/70 shadow-[2px_2px_0_rgba(27,21,48,0.25)]">
                Nothing pinned up yet.
                {board.canPost && !placing && " Click the cork to add one."}
              </p>
            )}
            {/* Only after the pin has rested: following the cursor from the first
            pixel would flicker across the board on the way to a note. */}
            {pin && resting && (
              <span
                aria-hidden
                style={{ left: pin.x + 14, top: pin.y + 6 }}
                className="pointer-events-none absolute rounded-[2px] bg-[#1b1530] px-1.5 py-0.5 text-[10px] whitespace-nowrap text-cream shadow-sm"
              >
                {placing ? "Move it here" : "Add a note"}
              </span>
            )}
            {/* Back to front: the newest note is last, so it paints on top. No
            z-index anywhere, including mid-drag — that order is the point. */}
            {notesInPaintOrder(notes).map((note) => {
              const at = sliding?.noteId === note.id ? sliding : note;
              return (
                <div
                  key={note.id}
                  style={{
                    left: offset(at.x, TILE_PX),
                    top: offset(at.y, NOTE_H),
                    width: TILE_PX,
                    transform: `rotate(${tiltFor(note.id)}deg)`,
                  }}
                  className="group absolute"
                >
                  <button
                    type="button"
                    title={note.title ?? "A drawing"}
                    aria-label={`${note.title ?? "A drawing"}, by ${note.author.name}`}
                    aria-haspopup="dialog"
                    onPointerDown={(e) => grab(e, note)}
                    onPointerMove={slide}
                    onPointerUp={release}
                    onPointerCancel={release}
                    onLostPointerCapture={abandon}
                    onClick={() => {
                      if (dragged.current) {
                        dragged.current = false;
                        return;
                      }
                      board.open(note.id);
                    }}
                    style={{ width: TILE_PX, height: TILE_PX }}
                    className={`block text-left select-none ${
                      board.canMove(note) ? "cursor-grab" : "cursor-pointer"
                    }`}
                  >
                    <StickyPaper
                      color={note.color}
                      size={TILE_PX}
                      outline={1.75}
                      className="transition-transform group-hover:-translate-y-0.5"
                    >
                      <NoticeCanvas
                        face="sticky"
                        doc={note.sticky}
                        width={TILE_PX}
                      />
                      {/* Small print on the glue strip: who put it up. */}
                      <span className="pointer-events-none absolute top-[2px] right-1.5 left-1.5 truncate text-[7.5px] leading-[11px] font-semibold text-[#1b1530]/55">
                        {note.author.name}
                      </span>
                    </StickyPaper>
                  </button>
                  {/* Beside the note, not inside its button: each pill is its own
                  button, toggling the viewer's reaction. */}
                  <div className="relative -mt-1.5 pl-1">
                    <ReactionPills
                      reactions={note.reactions}
                      onToggle={
                        board.canPost
                          ? (emoji) => board.react(note.id, emoji)
                          : undefined
                      }
                      onMore={() => board.open(note.id)}
                    />
                  </div>
                </div>
              );
            })}
          </>
        </div>
      </div>
      {/* Over the frame, not inside the cork, so each poster sits on its
        session's rows whatever the bar above the cork adds. */}
      <SessionPosterLayer
        notes={all}
        firstSlot={firstSlot}
        sessions={sessions}
        canManage={team}
        onTakeDown={(noteId) => void board.takeDown(noteId)}
        onSave={board.saveSessionPoster}
      />
    </div>
  );
}

/** One day's board as plain rows, for the view phones land on. */
export function NoteList({
  locationId,
  dayKey,
  name,
  height,
}: {
  locationId: string;
  dayKey: string;
  name: string;
  /** That day's board height in grid view, so a note added here fits it. */
  height: number;
}) {
  const board = useNoteBoard();
  // Session posters are on the schedule already, as their sessions.
  const notes = board.notesIn(locationId, dayKey).filter((n) => !n.session);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-grotesk text-sm font-bold text-navy">
          {name}: unconference board
        </h3>
        {board.canPost ? (
          <button
            type="button"
            onClick={() =>
              board.compose(
                locationId,
                dayKey,
                firstFreeSpot(notes, {
                  width: BOARD_MIN_W,
                  height,
                  tile: NOTE_H,
                }),
              )
            }
            className={`${ADD} text-xs`}
          >
            + Add a note
          </button>
        ) : (
          <PostHint className="text-xs text-[#1b1530]/55" />
        )}
      </div>
      {notes.length > 0 ? (
        <SessionRows>
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} onOpen={board.open} />
          ))}
        </SessionRows>
      ) : (
        <EmptyPanel>Nothing pinned up yet.</EmptyPanel>
      )}
    </section>
  );
}

function NoteRow({
  note,
  onOpen,
}: {
  note: BoardNote;
  onOpen: (noteId: string) => void;
}) {
  const body = note.summary;
  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onOpen(note.id)}
        className={`${ROW} transition-colors hover:bg-[#1b1530]/[0.04]`}
      >
        <StickyPaper
          color={note.color}
          size={64}
          outline={1.5}
          className="shrink-0"
        >
          <NoticeCanvas face="sticky" doc={note.sticky} width={64} />
        </StickyPaper>
        <div className="min-w-0 flex-1">
          <div className="leading-snug font-bold break-words">
            {note.title ?? "A drawing"}
          </div>
          {body && (
            <div className="mt-0.5 line-clamp-2 leading-snug break-words text-[#1b1530]/80">
              {body}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#1b1530]/65">
            {note.author.name}
            <ReactionPills reactions={note.reactions} max={6} />
          </div>
        </div>
      </button>
    </li>
  );
}
