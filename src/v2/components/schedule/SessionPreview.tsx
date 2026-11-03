"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { FaMapMarkerAlt, FaUsers } from "react-icons/fa";
import { formatPacificTime, hostNames } from "@/lib/schedule";
import type { Column, ViewSession } from "./ScheduleViews";
import { blockStyle, SessionMarks, SponsorTag } from "./SessionBits";

// One preview card for a whole grid: blocks only carry a data attribute, and
// listeners on the grid decide which session the card shows, so hovering
// re-renders the card alone, never the blocks.

/** Marks a grid block as previewable; its value is the session id. */
export const PREVIEW_ATTR = "data-preview";

const HOVER_DELAY_MS = 350;
const HIDE_DELAY_MS = 80;
const LONG_PRESS_MS = 450;
/** A finger that drifts further than this is scrolling, not pressing. */
const PRESS_SLOP_PX = 10;
const GAP_PX = 8;
const MARGIN_PX = 8;

type Shown = { id: string; anchor: DOMRect; touch: boolean };
type Side = "right" | "left" | "below" | "above";

// Beside the block for a mouse; above or below it for a finger, which is
// covering the block itself.
const HOVER_SIDES: Side[] = ["right", "left", "below", "above"];
const TOUCH_SIDES: Side[] = ["above", "below", "right", "left"];

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(v, Math.max(lo, hi)));

/** The first side of the block the card fits on, else clamped below it. */
function place(a: DOMRect, w: number, h: number, sides: Side[]) {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const beside = clamp(a.top, MARGIN_PX, vh - h - MARGIN_PX);
  const across = clamp(
    a.left + a.width / 2 - w / 2,
    MARGIN_PX,
    vw - w - MARGIN_PX,
  );
  const at: Record<Side, { x: number; y: number; fits: boolean }> = {
    right: {
      x: a.right + GAP_PX,
      y: beside,
      fits: a.right + GAP_PX + w <= vw - MARGIN_PX,
    },
    left: {
      x: a.left - GAP_PX - w,
      y: beside,
      fits: a.left - GAP_PX - w >= MARGIN_PX,
    },
    below: {
      x: across,
      y: a.bottom + GAP_PX,
      fits: a.bottom + GAP_PX + h <= vh - MARGIN_PX,
    },
    above: {
      x: across,
      y: a.top - GAP_PX - h,
      fits: a.top - GAP_PX - h >= MARGIN_PX,
    },
  };
  const side = sides.find((s) => at[s].fits);
  return side
    ? at[side]
    : { x: across, y: clamp(a.bottom + GAP_PX, MARGIN_PX, vh - h - MARGIN_PX) };
}

/**
 * The session under the pointer as a card: after a short hover with a mouse,
 * or a long press with a finger. A long press doesn't open the session; the
 * card it brings up does, on a tap.
 */
export default function SessionPreview<S extends ViewSession>({
  container,
  sessions,
  columns,
  href,
}: {
  container: RefObject<HTMLElement | null>;
  sessions: S[];
  columns: Column[];
  href: (s: S) => string | null;
}) {
  const [shown, setShown] = useState<Shown | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(
    () => new Map(sessions.map((s) => [s.id, s])),
    [sessions],
  );
  const session = shown ? byId.get(shown.id) : undefined;

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let showTimer = 0;
    let hideTimer = 0;
    let pressTimer = 0;
    let press: { x: number; y: number } | null = null;
    let pending: string | null = null;
    let current: string | null = null;
    // Set by a long press, so the click that ends it doesn't open the session.
    let swallowClick = false;

    const blockOf = (t: EventTarget | null) =>
      t instanceof Element ? t.closest<HTMLElement>(`[${PREVIEW_ATTR}]`) : null;
    const open = (block: HTMLElement, touch: boolean) => {
      pending = null;
      current = block.getAttribute(PREVIEW_ATTR);
      if (current)
        setShown({ id: current, anchor: block.getBoundingClientRect(), touch });
    };
    const hide = () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(pressTimer);
      press = null;
      pending = null;
      if (current === null) return;
      current = null;
      setShown(null);
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const block = blockOf(e.target);
      if (!block) return;
      clearTimeout(hideTimer);
      const id = block.getAttribute(PREVIEW_ATTR);
      if (id === current || id === pending) return;
      clearTimeout(showTimer);
      // Once a card is up, moving to the next block swaps it straight away.
      if (current) {
        open(block, false);
      } else {
        pending = id;
        showTimer = window.setTimeout(() => open(block, false), HOVER_DELAY_MS);
      }
    };
    const onOut = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const from = blockOf(e.target);
      const to = e.relatedTarget;
      if (!from || (to instanceof Node && from.contains(to))) return;
      hideTimer = window.setTimeout(hide, HIDE_DELAY_MS);
    };
    // Any press outside the card puts it away first (see onDown).
    const onAnyDown = (e: PointerEvent) => {
      swallowClick = false;
      const t = e.target;
      if (!(t instanceof Node && cardRef.current?.contains(t))) hide();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const block = blockOf(e.target);
      if (!block) return;
      press = { x: e.clientX, y: e.clientY };
      pressTimer = window.setTimeout(() => {
        press = null;
        swallowClick = true;
        open(block, true);
      }, LONG_PRESS_MS);
    };
    const onMove = (e: PointerEvent) => {
      if (
        press &&
        Math.hypot(e.clientX - press.x, e.clientY - press.y) > PRESS_SLOP_PX
      ) {
        clearTimeout(pressTimer);
        press = null;
      }
    };
    const endPress = () => {
      clearTimeout(pressTimer);
      press = null;
    };
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };
    // A held link otherwise brings up the browser's own link menu.
    const onContextMenu = (e: Event) => {
      if (press || swallowClick) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    // The card is placed once, so anything that moves the page puts it away.
    // A press in progress stays: a finger that scrolls cancels it anyway, and
    // the page shifting under a still finger shouldn't.
    const onMoved = () => {
      if (current || pending) hide();
    };

    // Capture, so it runs before onDown starts the next press.
    document.addEventListener("pointerdown", onAnyDown, true);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerout", onOut);
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerup", endPress);
    root.addEventListener("pointercancel", endPress);
    root.addEventListener("click", onClick, true);
    root.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("scroll", onMoved, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", onMoved);
    window.addEventListener("keydown", onKey);
    return () => {
      hide();
      document.removeEventListener("pointerdown", onAnyDown, true);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerout", onOut);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", endPress);
      root.removeEventListener("pointercancel", endPress);
      root.removeEventListener("click", onClick, true);
      root.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("scroll", onMoved, { capture: true });
      window.removeEventListener("resize", onMoved);
      window.removeEventListener("keydown", onKey);
    };
  }, [container]);

  // Placed before paint, straight on the element, so it never shows unplaced.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !shown) return;
    const { x, y } = place(
      shown.anchor,
      card.offsetWidth,
      card.offsetHeight,
      shown.touch ? TOUCH_SIDES : HOVER_SIDES,
    );
    // left/top rather than transform, which the enter animation animates.
    card.style.left = `${Math.round(x)}px`;
    card.style.top = `${Math.round(y)}px`;
    card.style.visibility = "visible";
  }, [shown, session]);

  if (!shown || !session) return null;
  const to = shown.touch ? href(session) : null;
  const room = columns.find((c) => c.id === session.locationId);
  const body = (
    <>
      <div aria-hidden className="h-1.5 border-b" style={blockStyle(session)} />
      <div className="flex flex-col gap-1.5 p-3.5">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-[#1b1530]/55 uppercase">
          {formatPacificTime(session.startsAt)} –{" "}
          {formatPacificTime(session.endsAt)}
        </div>
        <div className="flex flex-wrap items-start gap-1.5 text-[15px] leading-snug font-semibold">
          <span>{session.title}</span>
          <SessionMarks session={session} />
          {session.sponsored && <SponsorTag />}
        </div>
        {(room || session.hosts.length > 0) && (
          <div className="flex flex-col gap-0.5 text-[13px] text-[#1b1530]/70">
            {room && (
              <span className="flex items-baseline gap-1.5">
                <FaMapMarkerAlt
                  aria-hidden
                  size={11}
                  className="shrink-0 translate-y-px text-[#eaa35a]"
                />
                <span>
                  {room.name}
                  {room.campusLocation && (
                    <span className="text-[#1b1530]/50">
                      {" "}
                      · {room.campusLocation}
                    </span>
                  )}
                </span>
              </span>
            )}
            {session.hosts.length > 0 && (
              <span className="flex items-baseline gap-1.5">
                <FaUsers
                  aria-hidden
                  size={11}
                  className="shrink-0 translate-y-px text-[#eaa35a]"
                />
                <span className="line-clamp-2">{hostNames(session)}</span>
              </span>
            )}
          </div>
        )}
        {session.description && (
          <p className="mt-0.5 line-clamp-4 text-[13px] leading-relaxed whitespace-pre-line text-[#1b1530]/80">
            {session.description}
          </p>
        )}
        {to && (
          <div className="mt-1 text-[11px] font-semibold tracking-[0.12em] text-[#1b1530]/45 uppercase">
            Tap for details
          </div>
        )}
      </div>
    </>
  );
  return createPortal(
    <div
      ref={cardRef}
      aria-hidden={!to}
      style={{ visibility: "hidden" }}
      className={`fixed top-0 left-0 z-[90] w-[300px] max-w-[calc(100vw-16px)] animate-in overflow-hidden rounded-md border-[1.5px] border-[#1b1530]/15 bg-[#fff5e4] text-left text-[#1b1530] shadow-[0_8px_28px_rgba(27,21,48,0.28)] duration-100 fade-in-0 zoom-in-95 ${to ? "" : "pointer-events-none"}`}
    >
      {to ? (
        <Link
          href={to}
          scroll={false}
          onClick={() => setShown(null)}
          className="block"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </div>,
    document.body,
  );
}
