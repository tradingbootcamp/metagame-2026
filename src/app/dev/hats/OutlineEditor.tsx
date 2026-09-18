"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { hatCutoutStyle, polygon, type Hat } from "@/v2/hat-trick/hats";
import { round1, type Point } from "./format";

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

// Checkerboard, in screen pixels, for the see-through hole and the cut preview.
const CHECKER =
  "repeating-conic-gradient(rgba(23,48,89,0.18) 0% 25%, rgba(255,255,255,0.9) 0% 50%) 0 0 / 16px 16px";

// Index to insert a new point at so it lands on the outline's nearest edge.
// Distances are measured in pixel-ish space (x scaled by the image aspect)
// so a tall image doesn't make vertical edges look far away.
function nearestEdgeIndex(points: Point[], [px, py]: Point, aspect: number) {
  const n = points.length;
  const best = points.reduce<{ i: number; d: number }>(
    (acc, [ax, ay], i) => {
      const [bx, by] = points[(i + 1) % n];
      const x1 = ax * aspect;
      const y1 = ay;
      const x2 = bx * aspect;
      const y2 = by;
      const x = px * aspect;
      const y = py;
      const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      const t =
        len2 === 0
          ? 0
          : clamp(((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / len2, 0, 1);
      const d =
        (x - (x1 + t * (x2 - x1))) ** 2 + (y - (y1 + t * (y2 - y1))) ** 2;
      return d < acc.d ? { i: i + 1, d } : acc;
    },
    { i: n, d: Infinity },
  );
  return best.i;
}

export default function OutlineEditor({
  hat,
  points,
  selected,
  onSelect,
  onCommit,
  onBeginDrag,
  onMove,
  onDelete,
}: {
  hat: Hat;
  points: Point[];
  selected: number | null;
  onSelect: (i: number | null) => void;
  // A history-tracked replacement of the whole outline (add point).
  onCommit: (next: Point[]) => void;
  // Called once when a handle actually starts moving, so one drag is one undo.
  onBeginDrag: () => void;
  // Live update while dragging (not history-tracked).
  onMove: (i: number, p: Point) => void;
  onDelete: (i: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showCut, setShowCut] = useState(false);
  // Where the last zoom request wants to stay put, as fractions of the image
  // and the viewport offset they were under; applied once the new size lands.
  const anchor = useRef<{ fx: number; fy: number; ox: number; oy: number }>(
    null,
  );
  const drag = useRef<{ i: number; moved: boolean } | null>(null);

  const aspect = hat.image.width / hat.image.height;
  const canCut = points.length >= 3;

  const toPercent = (clientX: number, clientY: number): Point => {
    const rect = inner.current!.getBoundingClientRect();
    return [
      clamp(round1(((clientX - rect.left) / rect.width) * 100), 0, 100),
      clamp(round1(((clientY - rect.top) / rect.height) * 100), 0, 100),
    ];
  };

  // Zoom keeping the point under (clientX, clientY) — or the viewport centre —
  // where it is.
  const zoomTo = (next: number, at?: { x: number; y: number }) => {
    const s = scroller.current;
    const el = inner.current;
    if (!s || !el) return;
    const rect = s.getBoundingClientRect();
    const ox = at ? at.x - rect.left : s.clientWidth / 2;
    const oy = at ? at.y - rect.top : s.clientHeight / 2;
    anchor.current = {
      fx: (s.scrollLeft + ox) / el.clientWidth,
      fy: (s.scrollTop + oy) / el.clientHeight,
      ox,
      oy,
    };
    setZoom(clamp(round1(next), MIN_ZOOM, MAX_ZOOM));
  };

  useLayoutEffect(() => {
    const a = anchor.current;
    const s = scroller.current;
    const el = inner.current;
    if (!a || !s || !el) return;
    anchor.current = null;
    s.scrollLeft = a.fx * el.clientWidth - a.ox;
    s.scrollTop = a.fy * el.clientHeight - a.oy;
  }, [zoom]);

  // Ctrl/Cmd + wheel zooms around the cursor. Needs a non-passive listener
  // so the browser's own page zoom can be suppressed.
  useEffect(() => {
    const s = scroller.current;
    if (!s) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const el = inner.current;
      if (!el) return;
      const current = el.clientWidth / s.clientWidth;
      zoomTo(current * Math.exp(-e.deltaY * 0.004), {
        x: e.clientX,
        y: e.clientY,
      });
    };
    s.addEventListener("wheel", onWheel, { passive: false });
    return () => s.removeEventListener("wheel", onWheel);
    // zoomTo only reads refs, so the listener never goes stale.
  }, []);

  const addPoint = (e: ReactMouseEvent) => {
    const p = toPercent(e.clientX, e.clientY);
    const at =
      points.length < 3 ? points.length : nearestEdgeIndex(points, p, aspect);
    onCommit([...points.slice(0, at), p, ...points.slice(at)]);
    onSelect(at);
  };

  const onHandleDown = (e: ReactPointerEvent<HTMLButtonElement>, i: number) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { i, moved: false };
    onSelect(i);
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      d.moved = true;
      onBeginDrag();
    }
    onMove(d.i, toPercent(e.clientX, e.clientY));
  };
  const onHandleUp = () => {
    drag.current = null;
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
            Zoom
          </span>
          <button
            type="button"
            className="h-7 w-7 rounded border border-navy/30 bg-white leading-none hover:border-navy"
            onClick={() => zoomTo(zoom - 0.5)}
            aria-label="Zoom out"
          >
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="w-32 accent-meeple"
          />
          <button
            type="button"
            className="h-7 w-7 rounded border border-navy/30 bg-white leading-none hover:border-navy"
            onClick={() => zoomTo(zoom + 0.5)}
            aria-label="Zoom in"
          >
            +
          </button>
          <span className="w-10 font-space-mono text-xs tabular-nums">
            {zoom.toFixed(1)}×
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showCut}
            onChange={(e) => setShowCut(e.target.checked)}
            className="accent-meeple"
          />
          Show cut
        </label>
        <button
          type="button"
          disabled={selected === null}
          onClick={() => selected !== null && onDelete(selected)}
          className="rounded border border-navy/30 bg-white px-2 py-1 text-xs hover:border-navy disabled:opacity-40"
        >
          Delete point
          {selected !== null ? ` #${selected + 1}` : ""}
        </button>
        <span className="text-xs text-ink/60">
          {points.length} point{points.length === 1 ? "" : "s"}
        </span>
      </div>

      <p className="text-xs text-ink/60">
        Click the photo to add a point on the nearest edge of the outline. Drag
        a dot to move it; click one and press Delete to remove it, Esc to
        deselect. Ctrl/Cmd + scroll zooms around the cursor; scroll to pan.
        Ctrl/Cmd+Z undoes.
      </p>

      <div
        ref={scroller}
        className="relative max-h-[72vh] overflow-auto rounded-lg border border-navy/20 bg-navy/5"
      >
        <div
          ref={inner}
          className="relative"
          style={{ width: `${zoom * 100}%` }}
          onClick={addPoint}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution, uncropped, for tracing */}
          <img
            src={hat.image.src}
            width={hat.image.width}
            height={hat.image.height}
            alt=""
            draggable={false}
            className="block h-auto w-full cursor-crosshair select-none"
          />
          {showCut && canCut && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ clipPath: polygon(points), background: CHECKER }}
            />
          )}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {points.length >= 2 && (
              <polygon
                points={points.map((p) => p.join(",")).join(" ")}
                fill={showCut ? "none" : "rgba(216,80,43,0.25)"}
                stroke="#d8502b"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {points.map(([x, y], i) => (
            <button
              key={i}
              type="button"
              title={`Point ${i + 1}: ${x}, ${y}`}
              onPointerDown={(e) => onHandleDown(e, i)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              onClick={(e) => e.stopPropagation()}
              className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] active:cursor-grabbing ${
                selected === i ? "scale-125 bg-navy" : "bg-meeple"
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          ))}
        </div>
      </div>

      {showCut && (
        <div className="flex flex-wrap items-start gap-4 rounded-lg border border-navy/20 bg-white p-3">
          <div>
            <p className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
              Cut preview
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink/60">
              The hat exactly as the game paints it, using the same cutout code
              as the silhouette. The hole in the photo above is what stays
              behind.
            </p>
          </div>
          <div className="rounded p-3" style={{ background: CHECKER }}>
            {canCut ? (
              <div style={{ ...hatCutoutStyle(hat), width: 220 }} />
            ) : (
              <p className="text-xs text-ink/60">Needs at least 3 points.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
