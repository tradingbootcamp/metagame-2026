"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  pinNote,
  recolourNote,
  repinNote,
  rewriteNote,
  unpinNote,
  type NoteState,
} from "@/app/(v2)/schedule/note-actions";
import {
  boardEditor,
  canDeleteNote,
  canEditNote,
  canMoveNote,
  type BoardData,
  type BoardNote,
  type NoteColor,
} from "@/lib/unconference";
import NoteDialog from "./NoteDialog";

// Every note surface — the board column in grid view and the rows in list
// view — reads its notes from here, so switching view or day tab doesn't
// throw away a note that was just pinned up. The actions deliberately skip
// revalidatePath, so this state is the only thing that moves until the next
// server render.

type Spot = { x: number; y: number };

export type NoteBoard = {
  /** Whether there is an account, so a surface says which key is missing. */
  signedIn: boolean;
  canPost: boolean;
  isTeam: boolean;
  notesIn: (locationId: string) => BoardNote[];
  /** Whether this viewer may drag a note around, by the server's own rule. */
  canMove: (note: BoardNote) => boolean;
  open: (noteId: string) => void;
  compose: (locationId: string, spot: Spot) => void;
  /** Where a drag let go of a note: shown at once, then saved. */
  commit: (noteId: string, x: number, y: number) => void;
};

const Context = createContext<NoteBoard | null>(null);

export function useNoteBoard(): NoteBoard {
  const board = useContext(Context);
  if (!board) throw new Error("Note surfaces must be inside <BoardNotes>.");
  return board;
}

/** Shown when the viewer holds no ticket, so the board is read-only. */
export const NEEDS_TICKET_HINT = "A claimed ticket is needed to pin a note up.";

const FAILED = "Couldn’t save. Try again.";

const safely = async (run: () => Promise<NoteState>): Promise<NoteState> => {
  try {
    return await run();
  } catch {
    return { error: FAILED };
  }
};

const withNote = (list: BoardNote[], note: BoardNote) =>
  list.some((n) => n.id === note.id)
    ? list.map((n) => (n.id === note.id ? note : n))
    : [...list, note];

const moved = (list: BoardNote[], id: string, at: Spot) =>
  list.map((n) => (n.id === id ? { ...n, ...at } : n));

const without = (list: BoardNote[], id: string) =>
  list.filter((n) => n.id !== id);

type Pending =
  | { kind: "new"; locationId: string; spot: Spot }
  | { kind: "open"; noteId: string }
  | null;

export default function BoardNotes({
  board,
  children,
}: {
  board: BoardData;
  children: ReactNode;
}) {
  // `confirmed` is the server's last answer, for rolling back a failed write.
  const [state, setState] = useState({
    shown: board.notes,
    confirmed: board.notes,
    props: board.notes,
  });
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  // Drops land in order but an earlier answer can resolve after a later one,
  // so each note's sequence decides which answer may still be applied.
  const latest = useRef(new Map<string, number>());
  const shown = state.shown;

  // A fresh server render wins: it is the only thing that can know about a
  // note somebody else pinned up.
  if (state.props !== board.notes) {
    setState({
      shown: board.notes,
      confirmed: board.notes,
      props: board.notes,
    });
  }

  const notesIn = useCallback(
    (locationId: string) => shown.filter((n) => n.locationId === locationId),
    [shown],
  );

  const editorOf = (note: BoardNote) => boardEditor(note, board);

  const adopt = (note: BoardNote) =>
    setState((s) => ({
      ...s,
      shown: withNote(s.shown, note),
      confirmed: withNote(s.confirmed, note),
    }));

  const commit = useCallback(async (noteId: string, x: number, y: number) => {
    const seq = (latest.current.get(noteId) ?? 0) + 1;
    latest.current.set(noteId, seq);
    setError(null);
    setState((s) => ({ ...s, shown: moved(s.shown, noteId, { x, y }) }));
    const result = await safely(() => repinNote(noteId, x, y));
    const isLatest = latest.current.get(noteId) === seq;
    if (result.error || !result.position) {
      if (!isLatest) return;
      setState((s) => {
        const was = s.confirmed.find((n) => n.id === noteId);
        return was ? { ...s, shown: moved(s.shown, noteId, was) } : s;
      });
      setError(result.error ?? FAILED);
      return;
    }
    const at = result.position;
    setState((s) => ({
      ...s,
      confirmed: moved(s.confirmed, noteId, at),
      shown: isLatest ? moved(s.shown, noteId, at) : s.shown,
    }));
  }, []);

  async function create(locationId: string, spot: Spot, body: string) {
    setError(null);
    const result = await safely(() => pinNote(locationId, { body, ...spot }));
    if (result.note) adopt(result.note);
    return result;
  }

  async function rewrite(noteId: string, body: string) {
    setError(null);
    const result = await safely(() => rewriteNote(noteId, body));
    if (result.note) adopt(result.note);
    return result;
  }

  async function recolour(noteId: string, color: NoteColor) {
    setError(null);
    const result = await safely(() => recolourNote(noteId, color));
    if (result.note) adopt(result.note);
    return result;
  }

  async function remove(noteId: string) {
    setError(null);
    setState((s) => ({ ...s, shown: without(s.shown, noteId) }));
    const result = await safely(() => unpinNote(noteId));
    if (result.error) {
      setState((s) => {
        const was = s.confirmed.find((n) => n.id === noteId);
        return was ? { ...s, shown: withNote(s.shown, was) } : s;
      });
      // The dialog this is called from shows the error itself.
      return result;
    }
    setState((s) => ({ ...s, confirmed: without(s.confirmed, noteId) }));
    return result;
  }

  // A note that has gone (a delete, or a server render without it) leaves
  // nothing to draw; the stale `pending` is replaced by the next open.
  const openNote =
    pending?.kind === "open"
      ? (shown.find((n) => n.id === pending.noteId) ?? null)
      : null;

  const editor = openNote ? editorOf(openNote) : null;

  return (
    <Context.Provider
      value={{
        signedIn: board.signedIn,
        canPost: board.canPost,
        isTeam: board.isTeam,
        notesIn,
        // canPost as well as authorship: every write re-checks the permission,
        // so an author who has lost it is offered no drag it can only refuse.
        canMove: (note) => board.canPost && canMoveNote(editorOf(note)),
        open: (noteId) => setPending({ kind: "open", noteId }),
        compose: (locationId, spot) =>
          setPending({ kind: "new", locationId, spot }),
        commit,
      }}
    >
      {children}
      {/* Not beside the notes: a board column is a whole day tall, so a drag
          that failed near the bottom of it would report that hundreds of
          pixels above the viewport. */}
      {error && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-lg border border-cream/20 bg-navy px-4 py-2 text-sm text-cream shadow-lg"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-cream/55 underline underline-offset-4 hover:text-cream"
          >
            Dismiss
          </button>
        </div>
      )}
      {pending && (openNote || pending.kind === "new") && (
        <NoteDialog
          key={pending.kind === "open" ? pending.noteId : "new"}
          note={openNote}
          canEdit={
            board.canPost && (pending.kind === "new" || canEditNote(editor))
          }
          // Delete is not gated on canPost: a team member clearing the board
          // holds no ticket, and the action allows them without one.
          canDelete={!!openNote && canDeleteNote(editor)}
          onClose={() => setPending(null)}
          onSubmit={(body) =>
            pending.kind === "new"
              ? create(pending.locationId, pending.spot, body)
              : rewrite(pending.noteId, body)
          }
          onRecolour={
            openNote ? (color) => recolour(openNote.id, color) : undefined
          }
          onDelete={openNote ? () => remove(openNote.id) : undefined}
        />
      )}
    </Context.Provider>
  );
}
