"use client";

import { XIcon } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FACE_SIZE,
  INK_HEX,
  itemId,
  simplifyStroke,
  strokeHit,
  strokePath,
  TEXT_PX,
  type Face,
  type Ink,
  type NoticeDoc,
  type Para,
  type PenWidth,
  type StrokeItem,
  type TextItem,
  type TextSize,
} from "@/lib/notice-doc";
import { normalize, parasToHtml, serialize } from "./rich-text";

// One face of a notice — the sticky note or the poster — at its fixed logical
// size, scaled by CSS to whatever width it is given. Read-only by default;
// with `editing` it takes text, pen strokes and the eraser.

export type Tool = "type" | "pen" | "eraser";

export type Editing = {
  tool: Tool;
  ink: Ink;
  width: PenWidth;
  /** The size a new text box starts at. */
  textSize: TextSize;
  /**
   * A new version of the document. `coalesce` names a stream of edits (typing
   * into one box) that undo should treat as one step.
   */
  onChange: (doc: NoticeDoc, coalesce?: string) => void;
  /** The editable that has focus, so the toolbar can format inside it. */
  onFocusText: (el: HTMLElement | null, itemId: string | null) => void;
  /** Bumped by undo, so text boxes reload their DOM from the document. */
  resetKey: number;
  /** Shows the outline and accepts input; the other face waits. */
  active: boolean;
  onActivate: () => void;
};

const LINE = 1.25;
export const NOTE_FONT = "var(--font-grotesk), ui-sans-serif, system-ui";

// Sizes and bullets for the live editable; the read-only view sets these
// inline from the Para itself.
const EDITABLE =
  "outline-none whitespace-pre-wrap break-words [&_[data-size=s]]:text-[13px] [&_[data-size=m]]:text-[17px] [&_[data-size=l]]:text-[24px] [&_[data-size=xl]]:text-[36px] [&_[data-size=xl]]:leading-[1.1] [&_[data-size=l]]:leading-[1.15] [&_[data-bullet]]:relative [&_[data-bullet]]:pl-[1.1em] [&_[data-bullet]]:before:absolute [&_[data-bullet]]:before:left-[0.25em] [&_[data-bullet]]:before:content-['•'] [&_b]:font-bold";

function TextView({ paras }: { paras: Para[] }) {
  return (
    <>
      {paras.map((p, i) => (
        <div
          key={i}
          style={{
            fontSize: TEXT_PX[p.size],
            lineHeight: p.size === "xl" ? 1.1 : p.size === "l" ? 1.15 : LINE,
            position: p.bullet ? "relative" : undefined,
            paddingLeft: p.bullet ? "1.1em" : undefined,
          }}
        >
          {p.bullet && (
            <span aria-hidden style={{ position: "absolute", left: "0.25em" }}>
              •
            </span>
          )}
          {p.runs.length === 0 ? (
            <br />
          ) : (
            p.runs.map((r, j) =>
              r.b ? (
                <b key={j} className="font-bold">
                  {r.t}
                </b>
              ) : (
                <span key={j}>{r.t}</span>
              ),
            )
          )}
        </div>
      ))}
    </>
  );
}

function Strokes({
  strokes,
  w,
  h,
}: {
  strokes: StrokeItem[];
  w: number;
  h: number;
}) {
  return (
    <svg
      aria-hidden
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="pointer-events-none absolute inset-0"
    >
      {strokes.map((s) => (
        <path
          key={s.id}
          d={strokePath(s.points)}
          fill="none"
          stroke={INK_HEX[s.ink]}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** A text box being edited: an uncontrolled contentEditable. */
function EditableText({
  item,
  scale,
  bounds,
  editing,
  autoFocus,
  onChange,
  onRemove,
}: {
  item: TextItem;
  scale: number;
  bounds: { w: number; h: number };
  editing: Editing;
  autoFocus: boolean;
  onChange: (item: TextItem, coalesce?: string) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const latest = useRef(item);
  useEffect(() => {
    latest.current = item;
  });

  // Loaded once per mount; typing never re-renders the DOM under the caret.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = parasToHtml(latest.current.paras);
    if (autoFocus) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  const typing = editing.tool === "type" && editing.active;

  function onInput() {
    const el = ref.current;
    if (!el) return;
    normalize(el, editing.textSize);
    onChange(
      { ...latest.current, paras: serialize(el, editing.textSize) },
      `text:${item.id}`,
    );
  }

  // Move and resize, in logical px: pointer deltas divided by the scale.
  const grab = useRef<{
    mode: "move" | "resize";
    x0: number;
    y0: number;
    from: TextItem;
  } | null>(null);
  const { w: W, h: H } = bounds;

  function startGrab(e: ReactPointerEvent, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    grab.current = { mode, x0: e.clientX, y0: e.clientY, from: latest.current };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function moveGrab(e: ReactPointerEvent) {
    const g = grab.current;
    if (!g) return;
    const dx = (e.clientX - g.x0) / scale;
    const dy = (e.clientY - g.y0) / scale;
    const next =
      g.mode === "move"
        ? {
            ...g.from,
            x: Math.round(Math.min(Math.max(g.from.x + dx, 0), W - 40)),
            y: Math.round(Math.min(Math.max(g.from.y + dy, 0), H - 16)),
          }
        : {
            ...g.from,
            w: Math.round(Math.min(Math.max(g.from.w + dx, 40), W - g.from.x)),
          };
    onChange(next, `grab:${item.id}`);
  }
  function endGrab() {
    grab.current = null;
  }

  const showFrame = typing && focused;

  return (
    <div
      data-textbox
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        color: INK_HEX[item.ink],
      }}
      className={`absolute ${typing ? "" : "pointer-events-none"}`}
    >
      {showFrame && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[5px] rounded-[3px] border-[1.5px] border-dashed border-[#1b1530]/45"
          />
          <button
            type="button"
            aria-label="Move text box"
            title="Drag to move"
            onPointerDown={(e) => startGrab(e, "move")}
            onPointerMove={moveGrab}
            onPointerUp={endGrab}
            onPointerCancel={endGrab}
            onMouseDown={(e) => e.preventDefault()}
            style={{
              transform: `scale(${1 / scale})`,
              transformOrigin: "bottom left",
            }}
            className="absolute -top-[5px] -left-[5px] -translate-y-full cursor-move touch-none rounded-t-[4px] bg-[#1b1530] px-1.5 pb-0.5 text-[10px] leading-none font-bold tracking-widest text-cream select-none"
          >
            ⠿ move
          </button>
          <button
            type="button"
            aria-label="Remove text box"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRemove}
            style={{
              transform: `scale(${1 / scale})`,
              transformOrigin: "bottom right",
            }}
            className="absolute -top-[5px] -right-[5px] flex -translate-y-full items-center rounded-t-[4px] bg-[#d6405f] px-1 pb-0.5 text-cream"
          >
            <XIcon className="size-3" />
          </button>
          <div
            aria-label="Resize text box"
            role="separator"
            onPointerDown={(e) => startGrab(e, "resize")}
            onPointerMove={moveGrab}
            onPointerUp={endGrab}
            onPointerCancel={endGrab}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute top-1/2 -right-[9px] h-6 w-[7px] -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-[1.5px] border-[#1b1530] bg-cream"
          />
        </>
      )}
      <div
        ref={ref}
        contentEditable={typing}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        tabIndex={typing ? 0 : -1}
        onInput={onInput}
        onFocus={() => {
          setFocused(true);
          document.execCommand("defaultParagraphSeparator", false, "div");
          editing.onFocusText(ref.current, item.id);
        }}
        onBlur={(e) => {
          setFocused(false);
          editing.onFocusText(null, null);
          // A box left empty is a stray click, not content.
          const text = e.currentTarget.textContent?.trim() ?? "";
          if (!text) onRemove();
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
        }}
        style={{ fontFamily: NOTE_FONT, lineHeight: LINE, minHeight: "1em" }}
        className={`${EDITABLE} ${typing ? "cursor-text" : ""}`}
      />
    </div>
  );
}

export default function NoticeCanvas({
  face,
  doc,
  width,
  size,
  editing,
  className = "",
}: {
  face: Face;
  doc: NoticeDoc;
  /** Rendered width in CSS px; the height follows the face's proportions. */
  width: number;
  /** Logical size, for a face whose shape varies (a session poster's). */
  size?: { w: number; h: number };
  editing?: Editing;
  className?: string;
}) {
  const bounds = size ?? FACE_SIZE[face];
  const { w: W, h: H } = bounds;
  const scale = width / W;
  const surface = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<number[] | null>(null);
  const [erasing, setErasing] = useState<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const drawing = useRef(false);

  const strokes = doc.items.filter(
    (i): i is StrokeItem => i.kind === "stroke" && !erasing?.has(i.id),
  );
  const texts = doc.items.filter((i): i is TextItem => i.kind === "text");

  const at = (e: ReactPointerEvent) => {
    const rect = surface.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / scale, 0), W),
      y: Math.min(Math.max((e.clientY - rect.top) / scale, 0), H),
    };
  };

  const replace = (item: TextItem, coalesce?: string) =>
    editing?.onChange(
      { ...doc, items: doc.items.map((i) => (i.id === item.id ? item : i)) },
      coalesce,
    );
  const remove = (id: string) =>
    editing?.onChange({ ...doc, items: doc.items.filter((i) => i.id !== id) });

  function down(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editing) return;
    if (!editing.active) {
      editing.onActivate();
      if (editing.tool === "type") return;
    }
    if (e.button !== 0) return;
    const p = at(e);
    if (editing.tool === "type") {
      // A click inside a box is the box's; bare paper starts a new one.
      if ((e.target as HTMLElement).closest("[data-textbox]")) return;
      e.preventDefault();
      const id = itemId();
      const w = Math.max(80, Math.min(W - p.x - 8, Math.round(W * 0.7)));
      const x = Math.max(0, Math.min(p.x - 4, W - w));
      const item: TextItem = {
        id,
        kind: "text",
        x: Math.round(x),
        y: Math.round(Math.max(0, p.y - TEXT_PX[editing.textSize] * 0.6)),
        w: Math.round(w),
        ink: editing.ink,
        paras: [{ size: editing.textSize, runs: [] }],
      };
      setFresh(id);
      editing.onChange({ ...doc, items: [...doc.items, item] });
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    if (editing.tool === "pen") setLive([p.x, p.y]);
    else erase(p, new Set());
  }

  function erase(p: { x: number; y: number }, hit: Set<string>) {
    const next = new Set(hit);
    for (const s of doc.items) {
      if (s.kind === "stroke" && strokeHit(s, p.x, p.y, 6)) next.add(s.id);
    }
    setErasing(next);
  }

  function move(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drawing.current || !editing) return;
    const p = at(e);
    if (editing.tool === "pen") {
      setLive((pts) => {
        if (!pts) return pts;
        const lx = pts[pts.length - 2];
        const ly = pts[pts.length - 1];
        if (Math.hypot(p.x - lx, p.y - ly) < 1.2) return pts;
        return [...pts, p.x, p.y];
      });
    } else if (editing.tool === "eraser") {
      erase(p, erasing ?? new Set());
    }
  }

  function up() {
    if (!drawing.current || !editing) return;
    drawing.current = false;
    if (editing.tool === "pen" && live) {
      const points = simplifyStroke(live).map((v) => Math.round(v * 10) / 10);
      setLive(null);
      editing.onChange({
        ...doc,
        items: [
          ...doc.items,
          {
            id: itemId(),
            kind: "stroke",
            ink: editing.ink,
            width: editing.width,
            points,
          },
        ],
      });
    } else if (editing.tool === "eraser") {
      const gone = erasing;
      setErasing(null);
      if (gone?.size) {
        editing.onChange({
          ...doc,
          items: doc.items.filter((i) => !gone.has(i.id)),
        });
      }
    }
  }

  const drawingTool =
    editing?.active && (editing.tool === "pen" || editing.tool === "eraser");

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height: H * scale }}
    >
      <div
        ref={surface}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          fontFamily: NOTE_FONT,
          touchAction: drawingTool ? "none" : undefined,
          cursor: !editing
            ? undefined
            : editing.tool === "pen"
              ? "crosshair"
              : editing.tool === "eraser"
                ? "cell"
                : "text",
        }}
        className="absolute top-0 left-0 text-[#1b1530]"
      >
        {texts.map((t) =>
          editing ? (
            <EditableText
              key={`${t.id}:${editing.resetKey}`}
              item={t}
              scale={scale}
              bounds={bounds}
              editing={editing}
              autoFocus={fresh === t.id}
              onChange={replace}
              onRemove={() => remove(t.id)}
            />
          ) : (
            <div
              key={t.id}
              style={{ left: t.x, top: t.y, width: t.w, color: INK_HEX[t.ink] }}
              className="absolute break-words whitespace-pre-wrap"
            >
              <TextView paras={t.paras} />
            </div>
          ),
        )}
        <Strokes
          strokes={
            live && editing
              ? [
                  ...strokes,
                  {
                    id: "live",
                    kind: "stroke",
                    ink: editing.ink,
                    width: editing.width,
                    points: live,
                  },
                ]
              : strokes
          }
          w={W}
          h={H}
        />
      </div>
    </div>
  );
}
