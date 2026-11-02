"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clampNotePosition,
  firstFreeSpot,
  NOTE_PREVIEW_MAX,
  notesInPaintOrder,
  type BoardNote,
} from "@/lib/unconference";
import { NOTE_STYLES } from "@/v2/lib/schedule-styles";
import { NEEDS_TICKET_HINT, useNoteBoard } from "./NoteBoard";
import { EmptyPanel, ROW, SessionRows } from "./ScheduleViews";

// The bulletin board a "board" room's column is drawn as: identical post-its
// wherever their fractions put them, the oldest on top. A mouse drags them
// around; everything else taps one open.

/** Every note is the same tile; the overlay is what shows the whole thing. */
export const TILE_PX = 92;

/** A drag has to beat this many pixels before it counts as one. */
const DRAG_SLOP = 3;

/**
 * The board at its narrowest, for placing a note with no surface to measure:
 * list view draws no board, and the notes it pins up land on one this wide.
 * The width is the --board-w token GridDay sets on a phone; a bigger guess
 * would put notes on top of each other there.
 */
const BOARD_MIN = { width: 232, height: 12 * TILE_PX, tile: TILE_PX };

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

const preview = (body: string): string =>
  body.length > NOTE_PREVIEW_MAX
    ? `${body.slice(0, NOTE_PREVIEW_MAX - 1).trimEnd()}…`
    : body;

const BAR = "flex items-center gap-2 px-1.5 py-1.5 text-[11px]";
const HINT_LINK = "underline underline-offset-2 hover:text-[#1b1530]";

/**
 * Why this viewer can't pin a note up, and where to go about it. Signed out
 * and ticketless are different problems, and the board knows which it is.
 */
function PostHint({ className }: { className: string }) {
  const board = useNoteBoard();
  return (
    <span className={className}>
      {board.signedIn ? (
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

export default function UnconferenceBoard({
  locationId,
}: {
  locationId: string;
}) {
  const board = useNoteBoard();
  const notes = board.notesIn(locationId);
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
    // The tile's own width is the part of the board its left edge can't
    // reach, which is exactly what `offset` takes out again.
    const spanX = rect.width - TILE_PX;
    const spanY = rect.height - TILE_PX;
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
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = {
      noteId: note.id,
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
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

  function addNote() {
    const rect = surface.current?.getBoundingClientRect();
    const size = rect
      ? { width: rect.width, height: rect.height, tile: TILE_PX }
      : BOARD_MIN;
    board.compose(locationId, firstFreeSpot(notes, size));
  }

  // Where the pin is resting, in board pixels, once it has been still long
  // enough to mean it. Mouse only: a touch has no hover to read.
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [resting, setResting] = useState(false);
  const dwell = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `sliding`, not the drag ref: a ref read during render is off-limits, and
  // a note under capture keeps these handlers from firing anyway.
  const pinnable = board.canPost && !sliding;

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
    const spanY = rect.height - TILE_PX;
    // The point lands where the pin was, so the tile hangs below and right of
    // it the way a real one would.
    board.compose(
      locationId,
      clampNotePosition(
        spanX > 0 ? (e.clientX - rect.left) / spanX : 0,
        spanY > 0 ? (e.clientY - rect.top) / spanY : 0,
      ),
    );
    dropPin();
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#c08a55]/20">
      <div className={BAR}>
        {board.canPost ? (
          <button type="button" onClick={addNote} className={ADD}>
            + Add a note
          </button>
        ) : (
          <PostHint className="text-[#1b1530]/55" />
        )}
      </div>
      <div
        ref={surface}
        onPointerMove={trackPin}
        onPointerLeave={dropPin}
        onClick={pinHere}
        style={pinnable ? { cursor: PIN_CURSOR } : undefined}
        className="relative min-h-0 flex-1"
      >
        {notes.length === 0 && (
          <p className="px-2 py-3 text-center text-[11px] text-[#1b1530]/45">
            Nothing pinned up yet.
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
            Add a note
          </span>
        )}
        {/* Back to front: the oldest note is last, so it paints on top. No
            z-index anywhere, including mid-drag — that order is the point. */}
        {notesInPaintOrder(notes).map((note) => {
          const at = sliding?.noteId === note.id ? sliding : note;
          return (
            <button
              key={note.id}
              type="button"
              title={note.body}
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
              style={{
                left: offset(at.x, TILE_PX),
                top: offset(at.y, TILE_PX),
                width: TILE_PX,
                height: TILE_PX,
                ...NOTE_STYLES[note.color],
              }}
              className={`absolute flex flex-col overflow-hidden rounded-[2px] border p-1.5 text-left text-[#1b1530] shadow-[0_1px_4px_rgba(27,21,48,0.25)] select-none ${
                board.canMove(note) ? "cursor-grab" : "cursor-pointer"
              }`}
            >
              <span className="line-clamp-4 text-[11px] leading-tight">
                {preview(note.body)}
              </span>
              <span className="mt-auto truncate text-[9px] text-[#1b1530]/60">
                {note.author.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One board room's notes as plain rows, for the view phones land on. */
export function NoteList({
  locationId,
  name,
}: {
  locationId: string;
  name: string;
}) {
  const board = useNoteBoard();
  const notes = board.notesIn(locationId);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-grotesk text-sm font-bold text-navy">{name}</h3>
        {board.canPost ? (
          <button
            type="button"
            onClick={() =>
              board.compose(locationId, firstFreeSpot(notes, BOARD_MIN))
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
  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onOpen(note.id)}
        className={`${ROW} transition-colors hover:bg-[#1b1530]/[0.04]`}
      >
        <div
          aria-hidden
          className="w-1.5 shrink-0 rounded-full border"
          style={NOTE_STYLES[note.color]}
        />
        <div className="min-w-0 flex-1">
          <div className="leading-snug font-semibold break-words whitespace-pre-wrap">
            {note.body}
          </div>
          <div className="mt-0.5 text-[13px] text-[#1b1530]/65">
            {note.author.name}
          </div>
        </div>
      </button>
    </li>
  );
}
