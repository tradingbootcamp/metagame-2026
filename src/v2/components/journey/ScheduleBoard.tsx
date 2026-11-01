"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Check } from "lucide-react";
import type { Answer, Answers } from "@/v2/forms/engine";
import { cn } from "@/v2/lib/utils";
import { DISPLAY } from "./look";

// The volunteer application's availability as a calendar: a column per day,
// the hours down the side, and a block for each window, marked by clicking
// it or dragging across several. The marks are written to the four Airtable
// fields the form always had (Friday, Saturday and Sunday by shift; Thursday,
// Monday and the weeks before as other times), with Airtable's option names.

type Slot = { key: string; value: string };
type Block = Slot & { from: number; to: number };
type Day = { name: string; date: string; blocks: Block[] };

const SHIFTS: [string, number, number][] = [
  ["9am-1pm", 9, 13],
  ["1pm-5pm", 13, 17],
  ["5pm-9pm", 17, 21],
  ["9pm-1am", 21, 25],
];
const shifts = (key: string): Block[] =>
  SHIFTS.map(([value, from, to]) => ({ key, value, from, to }));
const other = (value: string, from: number, to: number): Block => ({
  key: "otherTimes",
  value,
  from,
  to,
});

const WEEKEND: Day[] = [
  { name: "Friday", date: "11/6", blocks: shifts("friday") },
  { name: "Saturday", date: "11/7", blocks: shifts("saturday") },
  { name: "Sunday", date: "11/8", blocks: shifts("sunday") },
];
const AROUND: Day[] = [
  {
    name: "Thursday",
    date: "11/5",
    blocks: [
      other("2pm-6pm Thursday (11/5)", 14, 18),
      other("6pm-10pm Thursday (11/5)", 18, 22),
    ],
  },
  {
    name: "Monday",
    date: "11/9",
    blocks: [
      other("9am-1pm Monday (11/9)", 9, 13),
      other("1pm-5pm Monday (11/9)", 13, 17),
    ],
  },
];
// The weeks before have no times, just whether, and how.
const AHEAD: (Slot & { label: string })[] = [
  {
    key: "otherTimes",
    value: "Further in advance (onsite)",
    label: "In person",
  },
  {
    key: "otherTimes",
    value: "Further in advance (virtual)",
    label: "Virtual",
  },
];
const BLOCKS = [...WEEKEND, ...AROUND].flatMap((d) => d.blocks);

/** The questions this board asks. */
export const SCHEDULE_KEYS = ["friday", "saturday", "sunday", "otherTimes"];

// Each column runs from 9 am to 1 am.
const START = 9;
const END = 25;
const HOUR = 16;
const y = (h: number) => (h - START) * HOUR;
const hour = (h: number) => {
  const x = h % 24;
  return `${x % 12 || 12}${x < 12 ? "am" : "pm"}`;
};

// Airtable's order, so the row reads tidily.
const ORDER = [...BLOCKS, ...AHEAD].map((s) => s.value);
const list = (v: Answer) => (Array.isArray(v) ? v : []);
const tidy = (xs: string[]) =>
  [...new Set(xs)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

const CHIP =
  "flex items-center gap-2 rounded-full border-2 px-3.5 py-2 text-[15px] font-semibold transition-[background-color,border-color,color,translate] duration-150 select-none active:translate-y-px";

export default function ScheduleBoard({
  answers,
  update,
}: {
  answers: Answers;
  update: (key: string, fn: (v: Answer) => Answer) => void;
}) {
  const isOn = (s: Slot) => list(answers[s.key]).includes(s.value);
  const mark = (s: Slot, on: boolean) =>
    update(s.key, (v) =>
      tidy(on ? [...list(v), s.value] : list(v).filter((x) => x !== s.value)),
    );

  // Press a block and drag across others to paint them the same way.
  const paint = useRef<boolean | null>(null);
  useEffect(() => {
    const stop = () => {
      paint.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);
  const press = (b: Block) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    paint.current = !isOn(b);
    mark(b, paint.current);
  };
  const drag = (e: PointerEvent) => {
    if (paint.current === null) return;
    const el = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-block]");
    const b = el && BLOCKS[Number(el.dataset.block)];
    if (b && isOn(b) !== paint.current) mark(b, paint.current);
  };

  const marked = BLOCKS.filter(isOn).length;
  const ahead = AHEAD.some(isOn);

  const calendar = (days: Day[]) => (
    <div
      onPointerMove={drag}
      className="grid touch-pan-y pb-3 select-none"
      style={{
        gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))`,
      }}
    >
      <span />
      {days.map((d) => {
        const whole = d.blocks.every(isOn);
        return (
          <button
            key={d.name}
            type="button"
            onClick={() => d.blocks.forEach((b) => mark(b, !whole))}
            title={`${whole ? "Clear" : "Mark"} all of ${d.name}`}
            aria-label={`${whole ? "Clear" : "Mark"} all of ${d.name}`}
            className="group pb-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-meeple"
          >
            <span
              className={`${DISPLAY} block text-[22px] leading-none text-navy transition-colors group-hover:text-meeple sm:text-[24px]`}
            >
              {d.name} {d.date}
            </span>
          </button>
        );
      })}
      <div
        aria-hidden
        className="relative border-t border-navy/15"
        style={{ height: y(END) }}
      >
        {[9, 13, 17, 21, 25].map((h) => (
          <span
            key={h}
            className="absolute right-2 -translate-y-1/2 font-space-mono text-[13px] font-bold text-ink/60"
            style={{ top: y(h) }}
          >
            {hour(h)}
          </span>
        ))}
      </div>
      {days.map((d) => (
        <div
          key={d.name}
          className="relative border-t border-l border-navy/15 last:border-r"
          style={{ height: y(END) }}
        >
          {[13, 17, 21].map((h) => (
            <span
              key={h}
              aria-hidden
              className="absolute inset-x-0 h-px bg-navy/10"
              style={{ top: y(h) }}
            />
          ))}
          {d.blocks.map((b) => {
            const on = isOn(b);
            return (
              <button
                key={b.value}
                type="button"
                data-block={BLOCKS.indexOf(b)}
                aria-pressed={on}
                aria-label={`${d.name} ${d.date}, ${hour(b.from)} to ${hour(b.to)}`}
                onPointerDown={press(b)}
                // Keyboard presses only: a pointer has already marked it.
                onClick={(e) => {
                  if (e.detail === 0) mark(b, !on);
                }}
                className={cn(
                  "absolute inset-x-1 flex flex-col items-center justify-center gap-0.5 rounded-md border-2 font-space-mono text-[14px] font-bold transition-[background-color,border-color,color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-2",
                  on
                    ? "border-moss bg-moss text-white"
                    : "border-dashed border-navy/30 bg-background text-navy/60 hover:border-navy hover:text-navy",
                )}
                style={{
                  top: y(b.from) + 2,
                  height: (b.to - b.from) * HOUR - 4,
                }}
              >
                {on && (
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                )}
                <span>
                  {hour(b.from)}–{hour(b.to)}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="text-[20px] font-semibold text-navy">During the con</h3>
        <p className="mt-1 text-[16px] leading-snug text-ink/65">
          Click/drag to select blocks.
        </p>
        <div className="mt-4">{calendar(WEEKEND)}</div>
      </section>

      <section>
        <h3 className="text-[20px] font-semibold text-navy">Around the con</h3>
        <div className="mt-4">{calendar(AROUND)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            aria-pressed={ahead}
            onClick={() => AHEAD.forEach((a) => mark(a, !ahead))}
            className={cn(
              CHIP,
              ahead
                ? "border-moss bg-moss text-white"
                : "border-navy/20 text-navy hover:-translate-y-0.5 hover:border-navy",
            )}
          >
            {ahead && <Check aria-hidden className="size-4" strokeWidth={3} />}
            Further in advance
          </button>
          {ahead && (
            <div className="flex animate-in flex-wrap gap-x-5 gap-y-2 duration-300 fade-in slide-in-from-left-1">
              {AHEAD.map((a) => {
                const on = isOn(a);
                return (
                  <label
                    key={a.value}
                    className="group flex cursor-pointer items-center gap-2 text-[15px] font-semibold text-navy has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-meeple has-[:focus-visible]:ring-offset-4"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => mark(a, !on)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-6 place-items-center rounded-md border-2 transition-colors",
                        on
                          ? "border-navy bg-navy text-cream"
                          : "border-navy/35 group-hover:border-navy",
                      )}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    {a.label}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <p className="flex justify-end border-t border-navy/15 pt-3">
        <button
          type="button"
          onClick={() => [...BLOCKS, ...AHEAD].forEach((s) => mark(s, false))}
          disabled={!marked && !ahead}
          className="font-space-mono text-[12px] font-bold tracking-[0.12em] text-meeple uppercase hover:underline disabled:no-underline disabled:opacity-40"
        >
          Clear
        </button>
      </p>
    </div>
  );
}
