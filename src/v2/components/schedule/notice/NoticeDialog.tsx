"use client";

import { PencilIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NoteState } from "@/app/(v2)/schedule/note-actions";
import {
  EMPTY_DOC,
  FACE_SIZE,
  isBlank,
  PAPER_HEX,
  recolourBox,
  type Face as AnyFace,
  type Ink,
  type NoticeDoc,
  type Paper,
} from "@/lib/notice-doc";
import type { BoardNote, NoteColor } from "@/lib/unconference";
import { Dialog, DialogContent, DialogTitle } from "@/v2/components/ui/dialog";
import NoticeCanvas, { type Editing } from "./NoticeCanvas";
import NoticeToolbar from "./NoticeToolbar";
import { PosterPaper, StickyPaper } from "./Paper";
import { ReactionBar, type Reactors } from "./Reactions";
import {
  useMeasuredSize,
  useNoticeTools,
  useUndoable,
} from "./useNoticeEditor";

// A notice blown up: the poster taped to the wall with its sticky note
// beside it, the author and the reactions underneath. The author (or the
// team) edits both faces in place; it saves itself, the way the old post-it did.

export type Draft = { sticky: NoticeDoc; poster: NoticeDoc; color: NoteColor };

/** The two faces a notice dialog edits; a session poster has its own editor. */
type Face = Exclude<AnyFace, "banner">;

const AUTOSAVE_MS = 900;
const STICKY_W = 220;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });

function Hint({ show, children }: { show: boolean; children: string }) {
  if (!show) return null;
  return (
    <p className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 text-center text-sm leading-snug text-[#1b1530]/40">
      {children}
    </p>
  );
}

export default function NoticeDialog({
  note,
  draftColor,
  canEdit,
  canDelete,
  canReact,
  reactHint,
  onClose,
  onSave,
  onDelete,
  onReact,
  loadReactors,
}: {
  /** Null while composing a new notice. */
  note: BoardNote | null;
  draftColor?: NoteColor;
  canEdit: boolean;
  canDelete: boolean;
  canReact: boolean;
  /** What to offer instead of reacting, for a viewer who can't. */
  reactHint?: React.ReactNode;
  onClose: () => void;
  /** With no id, this is the first save and pins the notice up. */
  onSave: (draft: Draft, id: string | null) => Promise<NoteState>;
  onDelete: (id: string) => Promise<NoteState>;
  onReact: (id: string, emoji: string) => void;
  loadReactors: (id: string) => Promise<Reactors>;
}) {
  const initial: Draft = {
    sticky: note?.sticky ?? EMPTY_DOC,
    poster: note?.poster ?? { ...EMPTY_DOC, paper: "white" },
    color: note?.color ?? draftColor ?? "butter",
  };
  const {
    draft,
    draftRef,
    commit,
    replace,
    undo: undoDraft,
    canUndo,
    resetKey,
  } = useUndoable<Draft>(initial);
  const [editing, setEditing] = useState(!note && canEdit);
  const [face, setFace] = useState<Face>("sticky");
  const tools = useNoticeTools<{ face: Face }>();
  const { tool, ink, width, textSize, activeText, setActiveText } = tools;

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The notice this dialog is editing: the one it opened, or the one its
  // first save created. The ref is for handlers mid-save; the state renders.
  const idRef = useRef<string | null>(note?.id ?? null);
  const [liveId, setLiveId] = useState<string | null>(note?.id ?? null);
  // Rebuilt whenever the chips change, so an open "View reactions" reloads
  // with the viewer's own tap in it.
  const chips = note?.reactions;
  const reactors = useCallback(
    () => (liveId && chips ? loadReactors(liveId) : Promise.resolve([])),
    [liveId, chips, loadReactors],
  );
  const stored = useRef(JSON.stringify(initial));
  const inFlight = useRef<Promise<void> | null>(null);

  // The board's listing leaves posters out, so an opened notice's arrives a
  // moment after the dialog does; it is taken in once, with no edits
  // allowed until then.
  const loaded = !note || note.poster !== null;
  const tookPoster = useRef(loaded);
  useEffect(() => {
    if (tookPoster.current || !note?.poster) return;
    tookPoster.current = true;
    const next = { ...draftRef.current, poster: note.poster };
    replace(next);
    stored.current = JSON.stringify(next);
  }, [note?.poster, draftRef, replace]);

  const changeFace = useCallback(
    (f: Face, doc: NoticeDoc, key?: string) =>
      commit({ ...draftRef.current, [f]: doc }, key),
    [commit, draftRef],
  );

  function undo() {
    if (undoDraft()) setActiveText(null);
  }

  const save = useCallback(async (): Promise<void> => {
    if (inFlight.current) await inFlight.current;
    const d = draftRef.current;
    const mark = JSON.stringify(d);
    if (mark === stored.current) return;
    // Nothing on either face: nothing worth pinning up yet.
    if (isBlank(d.sticky) && isBlank(d.poster)) return;
    const run = (async () => {
      setSaving(true);
      setError(null);
      const result = await onSave(d, idRef.current);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      stored.current = mark;
      if (result.note && !idRef.current) {
        idRef.current = result.note.id;
        setLiveId(result.note.id);
      }
    })();
    inFlight.current = run;
    await run;
    inFlight.current = null;
  }, [onSave, draftRef]);

  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [draft, editing, save]);

  // Undo outside a text box; inside one the browser's own undo has the text.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        !(e.metaKey || e.ctrlKey) ||
        e.key.toLowerCase() !== "z" ||
        e.shiftKey
      ) {
        return;
      }
      if ((e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function finish() {
    void save().finally(onClose);
  }

  // The poster takes what width the dialog has; the sticky sits beside it on
  // a wide screen and above it on a phone.
  const [body, { w: room }] = useMeasuredSize();
  const wide = room >= 700;
  const posterW = Math.max(
    200,
    Math.min(FACE_SIZE.poster.w, wide ? room - STICKY_W - 56 : room - 24),
  );
  const stickyW = wide ? STICKY_W : Math.min(180, Math.round(room * 0.55));

  const editingFor = (f: Face): Editing | undefined =>
    editing
      ? {
          tool,
          ink,
          width,
          textSize,
          resetKey,
          active: face === f,
          onActivate: () => {
            if (activeText && activeText.face !== f) tools.releaseText();
            setFace(f);
          },
          onChange: (doc, key) => changeFace(f, doc, key),
          onFocusText: (el, id) => {
            setActiveText(el && id ? { el, id, face: f } : null);
            if (el) setFace(f);
          },
        }
      : undefined;

  function pickInk(i: Ink) {
    tools.setInk(i);
    // A focused text box takes the colour too.
    if (!activeText) return;
    const d = draftRef.current;
    commit({
      ...d,
      [activeText.face]: recolourBox(d[activeText.face], activeText.id, i),
    });
  }

  const paper = (draft.poster.paper ?? "white") as Paper;
  const ringed = (f: Face) =>
    editing && face === f
      ? "outline-[3px] outline-offset-[6px] outline-dashed outline-[#3f6fd1]/70"
      : "";

  const sticky = (
    <div className="flex flex-col items-center gap-2">
      <StickyPaper
        color={draft.color}
        size={stickyW}
        className={`${ringed("sticky")} rounded-[2px]`}
      >
        <NoticeCanvas
          face="sticky"
          doc={draft.sticky}
          width={stickyW}
          editing={editingFor("sticky")}
        />
        <Hint show={editing && isBlank(draft.sticky) && face !== "sticky"}>
          The sticky note is what the board shows. Click to write on it.
        </Hint>
        <Hint show={editing && isBlank(draft.sticky) && face === "sticky"}>
          {tool === "type" ? "Click anywhere to write" : "Draw something"}
        </Hint>
      </StickyPaper>
      {editing && (
        <span className="text-[11px] font-semibold tracking-[0.12em] text-[#1b1530]/45 uppercase">
          Sticky note
        </span>
      )}
    </div>
  );

  const poster = (
    <div className="flex flex-col items-center gap-2">
      <PosterPaper paper={PAPER_HEX[paper]} className={ringed("poster")}>
        <NoticeCanvas
          face="poster"
          doc={draft.poster}
          width={posterW}
          editing={editingFor("poster")}
        />
        <Hint show={editing && isBlank(draft.poster)}>
          {face === "poster"
            ? tool === "type"
              ? "Click anywhere to add text — a title, a list, the details"
              : "Draw something"
            : "The poster opens when someone taps your sticky note. Click to work on it."}
        </Hint>
      </PosterPaper>
      {editing && (
        <span className="mt-2 text-[11px] font-semibold tracking-[0.12em] text-[#1b1530]/45 uppercase">
          Poster
        </span>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && finish()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-ink/75"
        className="max-h-[94dvh] max-w-[860px] overflow-y-auto border-[#1b1530]/20 bg-[#ece2cb] [background-image:radial-gradient(rgba(27,21,48,0.05)_1px,transparent_1px)] [background-size:14px_14px] p-0 text-[#1b1530]"
      >
        <DialogTitle className="sr-only">
          {note?.title ?? (note ? "A notice" : "New notice")}
        </DialogTitle>
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-[#ece2cb]/95 px-3 py-2 backdrop-blur-sm sm:px-5">
          {editing ? (
            <NoticeToolbar
              face={face}
              tool={tool}
              onTool={tools.pickTool}
              ink={ink}
              onInk={pickInk}
              width={width}
              onWidth={tools.setWidth}
              textSize={textSize}
              onTextSize={tools.setTextSize}
              activeText={tools.activeEditable}
              color={draft.color}
              onColor={(c) => commit({ ...draftRef.current, color: c })}
              paper={paper}
              onPaper={(p) =>
                commit({
                  ...draftRef.current,
                  poster: { ...draftRef.current.poster, paper: p },
                })
              }
              canUndo={canUndo}
              onUndo={undo}
            />
          ) : (
            canEdit &&
            loaded && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-md border-[1.5px] border-[#1b1530] bg-cream px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_#1b1530] hover:bg-white"
              >
                <PencilIcon className="size-3.5" />
                Edit
              </button>
            )
          )}
          <div className="ml-auto flex items-center gap-2">
            <span
              role="status"
              className={`text-xs ${error ? "text-[#c02f4e]" : "text-[#1b1530]/50"}`}
            >
              {error ??
                (!loaded
                  ? "Loading…"
                  : saving
                    ? "Saving…"
                    : editing && liveId
                      ? "Saved"
                      : "")}
            </span>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  void save();
                  if (
                    !idRef.current &&
                    isBlank(draftRef.current.sticky) &&
                    isBlank(draftRef.current.poster)
                  ) {
                    onClose();
                    return;
                  }
                  setEditing(false);
                  setActiveText(null);
                }}
                className="rounded-md border-[1.5px] border-[#1b1530] bg-[#1b1530] px-3 py-1.5 text-xs font-bold text-cream hover:bg-[#2c2350]"
              >
                Done
              </button>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={finish}
              className="flex size-8 items-center justify-center rounded-md text-[#1b1530]/55 hover:bg-[#1b1530]/10 hover:text-[#1b1530]"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>

        <div ref={body} className="px-3 pt-6 pb-5 sm:px-6">
          {room > 0 && (
            <div
              className={
                wide
                  ? "flex items-start justify-center gap-10"
                  : "flex flex-col items-center gap-8"
              }
            >
              {wide ? (
                <>
                  {poster}
                  <div className="pt-6">{sticky}</div>
                </>
              ) : (
                <>
                  {sticky}
                  {poster}
                </>
              )}
            </div>
          )}

          <div
            className="mx-auto mt-6 flex flex-col gap-3"
            style={{ maxWidth: wide ? posterW + STICKY_W + 40 : posterW }}
          >
            {note && (
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="text-[#1b1530]/55">Pinned up by</span>
                <span className="font-bold">{note.author.name}</span>
                <span className="text-xs text-[#1b1530]/45">
                  {when(note.createdAt)}
                </span>
              </div>
            )}
            {liveId && note && (
              <ReactionBar
                reactions={note.reactions}
                canReact={canReact}
                signInHint={reactHint}
                onToggle={(emoji) => onReact(liveId, emoji)}
                loadReactors={reactors}
              />
            )}
            {canDelete && liveId && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                {confirmDelete ? (
                  <>
                    <span>Take this notice down for good?</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await onDelete(liveId);
                        if (r.error) setError(r.error);
                        else onClose();
                      }}
                      className="rounded-md bg-[#c02f4e] px-2.5 py-1 font-bold text-cream"
                    >
                      Take it down
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="underline underline-offset-2"
                    >
                      Keep it
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-[#1b1530]/55 underline underline-offset-2 hover:text-[#c02f4e]"
                  >
                    Take down
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
