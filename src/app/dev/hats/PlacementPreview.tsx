"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { HEADING } from "@/v2/components/styles";
import HatPile from "@/v2/hat-trick/HatPile";
import type { Hat, HatId } from "@/v2/hat-trick/hats";
import { round1, type Wear } from "./format";

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const FIELDS: {
  key: keyof Wear;
  label: string;
  min: number;
  max: number;
  hint: string;
}[] = [
  { key: "width", label: "Width", min: 10, max: 100, hint: "% of the card" },
  {
    key: "bottom",
    label: "Bottom",
    min: 0,
    max: 100,
    hint: "brim's height, when worn first",
  },
  {
    key: "lift",
    label: "Lift",
    min: -40,
    max: 40,
    hint: "bottom edge above the center of the hat below",
  },
  { key: "rotate", label: "Rotate", min: -45, max: 45, hint: "degrees" },
  { key: "shiftX", label: "Shift X", min: -30, max: 30, hint: "+ is right" },
];

// The "You?" card as the site renders it, with the edited hat on top of
// whichever other hats are checked. Placement comes from HatPile, the same
// component SpeakerCtaCard uses, so nothing here is approximated.
export default function PlacementPreview({
  hat,
  others,
  beneath,
  onToggleBeneath,
  wear,
  onWearChange,
}: {
  hat: Hat;
  others: Hat[];
  beneath: HatId[];
  onToggleBeneath: (id: HatId) => void;
  wear: Wear;
  onWearChange: (next: Wear) => void;
}) {
  const square = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    bottom: number;
    lift: number;
    shiftX: number;
  } | null>(null);

  const ready = hat.points.length >= 3;
  const pile = ready
    ? [...others.filter((h) => beneath.includes(h.id)), hat]
    : [];
  const wornFirst = pile.length <= 1;

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      bottom: wear.bottom,
      lift: wear.lift ?? 0,
      shiftX: wear.shiftX ?? 0,
    };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = square.current;
    if (!d || !el) return;
    // The hat box is 86% of the square, in 100 units.
    const unit = (el.clientWidth * 0.86) / 100;
    const dy = (e.clientY - d.y) / unit;
    onWearChange({
      ...wear,
      // Worn first, dragging moves the brim; on a pile it changes the lift.
      ...(wornFirst
        ? { bottom: clamp(round1(d.bottom + dy), 0, 100) }
        : { lift: clamp(round1(d.lift - dy), -40, 40) }),
      shiftX: clamp(round1(d.shiftX + (e.clientX - d.x) / unit), -30, 30),
    });
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* No overflow clipping here, matching the site: a tall pile rises above the card. */}
      <div className="mx-auto mt-16 w-full max-w-[280px] rounded-2xl border border-dashed border-navy/40 bg-white shadow-[0_8px_24px_rgba(23,48,89,0.08)]">
        <div
          ref={square}
          className="relative flex aspect-square w-full items-end justify-center rounded-t-2xl bg-navy/[0.06]"
        >
          <svg viewBox="0 0 100 100" className="h-[86%] w-[86%] fill-navy/15">
            <path d="M50 8c-16 0-23 11-23 24 0 11-1 22-5 30 3 4 12 4 18-1v4c-8 1-20 4-26 11-5 5-7 14-7 24h86c0-10-2-19-7-24-6-7-18-10-26-11v-4c6 5 15 5 18 1-4-8-5-19-5-30 0-13-7-24-23-24z" />
          </svg>
          <HatPile hats={pile} />
          <div
            title="Drag to move the hat"
            className="absolute inset-0 cursor-move touch-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
        <div className="px-4 py-3 text-center">
          <h3 className={`${HEADING} text-lg text-navy`}>
            {pile.length ? `Hat count: ${pile.length}` : "You?"}
          </h3>
          <p className="mt-1 font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
            <span className="underline underline-offset-2">
              Submit a proposal &rarr;
            </span>
          </p>
        </div>
      </div>
      <p className="text-xs text-ink/60">
        {ready
          ? "Drag the hat on the card to set Bottom (worn first) or Lift (on a pile) and Shift X, or use the sliders."
          : "The outline needs at least 3 points before the hat can be worn."}
      </p>

      <div className="flex flex-col gap-2">
        {FIELDS.map(({ key, label, min, max, hint }) => {
          const value = wear[key] ?? 0;
          const dim =
            (key === "bottom" && !wornFirst) || (key === "lift" && wornFirst);
          return (
            <label
              key={key}
              className={`grid grid-cols-[4.5rem_1fr_4rem] items-center gap-2 text-sm ${
                dim ? "opacity-50" : ""
              }`}
              title={
                dim
                  ? "Bottom only applies when this hat is worn first; on a pile it sits on the hat below."
                  : hint
              }
            >
              <span>{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={0.5}
                value={value}
                onChange={(e) =>
                  onWearChange({ ...wear, [key]: Number(e.target.value) })
                }
                className="accent-meeple"
              />
              <input
                type="number"
                min={min}
                max={max}
                step={0.5}
                value={value}
                onChange={(e) =>
                  onWearChange({
                    ...wear,
                    [key]: clamp(Number(e.target.value), min, max),
                  })
                }
                className="w-full rounded border border-navy/30 bg-white px-1 py-0.5 font-space-mono text-xs tabular-nums"
              />
            </label>
          );
        })}
      </div>

      {others.length > 0 && (
        <fieldset className="text-sm">
          <legend className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
            Wear beneath
          </legend>
          <p className="mt-1 text-xs text-ink/60">
            Check hats to put under this one and see how it sits second or third
            in the pile.
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {others.map((h) => (
              <label key={h.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={beneath.includes(h.id)}
                  onChange={() => onToggleBeneath(h.id)}
                  className="accent-meeple"
                />
                {h.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
