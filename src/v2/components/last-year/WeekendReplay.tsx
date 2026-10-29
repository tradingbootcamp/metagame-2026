"use client";

import {
  useEffect,
  useReducer,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Pause, Play } from "lucide-react";
import {
  days,
  formatPacificTime,
  pacificMinutes,
  scheduleLocations,
  slotLabel,
  SLOT_MINUTES,
  type Session,
} from "@/v2/lib/last-year-schedule";
import { LEGEND, sessionStyle } from "@/v2/lib/schedule-styles";
import LastYearSessionModal from "../schedule/LastYearSessionModal";
import { DISPLAY } from "../styles";

// How far the clock moves per tick of the replay, and how often it ticks.
const STEP = 15;
const TICK_MS = 700;

// Each day's sessions as minutes since Pacific midnight, the day's span, and
// how many sessions were running at each step of it.
const DAYS = days.map((d) => {
  const start = d.slots[0];
  const end = d.slots[d.slots.length - 1] + SLOT_MINUTES;
  const timed = d.sessions.map((s) => {
    const a = pacificMinutes(s.start_time);
    const b = pacificMinutes(s.end_time);
    return { s, a, b: b <= a ? b + 24 * 60 : b };
  });
  const steps: { t: number; n: number }[] = [];
  for (let t = start; t < end; t += STEP)
    steps.push({ t, n: timed.filter((x) => x.a <= t && t < x.b).length });
  const peak = Math.max(...steps.map((s) => s.n));
  return { name: d.name, start, end, timed, steps, peak };
});
const LAST = DAYS.length - 1;

// The replay opens on the weekend's busiest moment, so the board starts full.
const OPENING = DAYS.reduce(
  (best, d, day) =>
    d.peak > best.n
      ? { day, t: d.steps.find((s) => s.n === d.peak)!.t, n: d.peak }
      : best,
  { day: 0, t: DAYS[0].start, n: -1 },
);

const hourLabel = (t: number) => {
  const h = Math.floor(t / 60) % 24;
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
};

type State = { day: number; t: number; playing: boolean };
type Action =
  | { type: "tick" | "toggle" | "pause" }
  | { type: "seek"; t: number }
  | { type: "day"; day: number };

const clamp = (day: number, t: number) =>
  Math.min(DAYS[day].end - STEP, Math.max(DAYS[day].start, t));
const atEnd = ({ day, t }: State) => day === LAST && t + STEP >= DAYS[LAST].end;

function replay(s: State, a: Action): State {
  switch (a.type) {
    case "tick":
      if (s.t + STEP < DAYS[s.day].end) return { ...s, t: s.t + STEP };
      if (s.day < LAST)
        return { ...s, day: s.day + 1, t: DAYS[s.day + 1].start };
      return { ...s, playing: false };
    case "toggle":
      if (s.playing) return { ...s, playing: false };
      // From the end, play again from Friday afternoon.
      return atEnd(s)
        ? { day: 0, t: DAYS[0].start, playing: true }
        : { ...s, playing: true };
    case "pause":
      return { ...s, playing: false };
    case "seek":
      return { ...s, t: clamp(s.day, a.t) };
    // Same time of day, another day.
    case "day":
      return { ...s, day: a.day, t: clamp(a.day, s.t) };
  }
}

// §2: the 2025 weekend on a clock. Press play and it runs fifteen minutes at
// a time across all three days; drag along the day's pulse (how many
// sessions were running when) to jump. The board shows every venue and what
// was on there at that moment; click a session for its card.
export default function WeekendReplay() {
  const [state, dispatch] = useReducer(replay, {
    day: OPENING.day,
    t: OPENING.t,
    playing: false,
  });
  const { day, t, playing } = state;
  const [open, setOpen] = useState<Session | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const d = DAYS[day];
  const running = d.timed.filter((x) => x.a <= t && t < x.b);
  const ticks: number[] = [];
  for (let h = Math.ceil(d.start / 60) * 60; h < d.end; h += 180) ticks.push(h);

  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * d.steps.length);
    dispatch({
      type: "seek",
      t: d.steps[Math.min(d.steps.length - 1, Math.max(0, i))].t,
    });
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const jump: Record<string, number> = {
      ArrowRight: STEP,
      ArrowUp: STEP,
      ArrowLeft: -STEP,
      ArrowDown: -STEP,
      PageUp: 60,
      PageDown: -60,
      Home: -24 * 60,
      End: 24 * 60,
    };
    if (!(e.key in jump)) return;
    e.preventDefault();
    dispatch({ type: "seek", t: t + jump[e.key] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => dispatch({ type: "toggle" })}
          className={`${DISPLAY} flex items-center gap-2 rounded-xl bg-meeple py-2.5 pr-5 pl-4 text-[22px] leading-none text-cream transition-transform hover:-translate-y-0.5 active:translate-y-0`}
        >
          {playing ? (
            <Pause aria-hidden className="size-5" fill="currentColor" />
          ) : (
            <Play aria-hidden className="size-5" fill="currentColor" />
          )}
          {playing ? "Pause" : atEnd(state) ? "Play it again" : "Play"}
        </button>
        <div
          role="group"
          aria-label="Day"
          className="flex overflow-hidden rounded-xl border-2 border-navy"
        >
          {DAYS.map((x, i) => (
            <button
              key={x.name}
              type="button"
              aria-pressed={i === day}
              onClick={() => dispatch({ type: "day", day: i })}
              className={`${DISPLAY} px-3.5 py-2 text-[20px] leading-none tracking-[0.04em] transition-colors sm:px-5 ${
                i === day ? "bg-navy text-cream" : "text-navy hover:bg-sky"
              }`}
            >
              {x.name.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="ml-auto text-right">
          <span
            className={`${DISPLAY} block text-[clamp(30px,4vw,44px)] leading-none text-navy`}
          >
            {d.name} · {slotLabel(t)}
          </span>
          <span className="font-space-mono text-xs tracking-[0.1em] text-ink/60 uppercase">
            {running.length} {running.length === 1 ? "session" : "sessions"} in
            play
          </span>
        </p>
      </div>

      {/* The day's pulse, which is also the scrubber. */}
      <div className="mt-6">
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Time of day, ${d.name}`}
          aria-valuemin={d.start}
          aria-valuemax={d.end - STEP}
          aria-valuenow={t}
          aria-valuetext={`${d.name} ${slotLabel(t)}, ${running.length} sessions running`}
          onKeyDown={key}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrub(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
          }}
          className="flex h-16 cursor-pointer touch-pan-y items-end gap-[2px] rounded-md border-b border-navy/20 outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          {d.steps.map((s) => (
            <span
              key={s.t}
              className="group relative flex h-full flex-1 items-end justify-center"
            >
              {s.n > 0 && (
                <span
                  className={`w-full max-w-6 rounded-t-[4px] transition-colors ${
                    s.t === t
                      ? "bg-meeple"
                      : s.t < t
                        ? "bg-navy/45 group-hover:bg-navy/70"
                        : "bg-navy/20 group-hover:bg-navy/45"
                  }`}
                  style={{ height: `${(s.n / d.peak) * 100}%` }}
                />
              )}
              <span className="pointer-events-none absolute bottom-full z-10 mb-1.5 rounded bg-navy px-2 py-1 font-space-mono text-[10.5px] whitespace-nowrap text-cream/80 opacity-0 transition-opacity group-hover:opacity-100">
                <b className="text-cream">{s.n}</b> running · {slotLabel(s.t)}
              </span>
            </span>
          ))}
        </div>
        <div className="relative mt-1.5 h-4 font-space-mono text-[10.5px] text-ink/55">
          {ticks.map((h) => (
            <span
              key={h}
              className="absolute -translate-x-1/2 first:translate-x-0"
              style={{ left: `${((h - d.start) / (d.end - d.start)) * 100}%` }}
            >
              {hourLabel(h)}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink/70">
        {LEGEND.map((entry) => (
          <li key={entry.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3.5 rounded-sm border"
              style={entry.style}
            />
            {entry.label}
          </li>
        ))}
      </ul>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {scheduleLocations.map((loc) => {
          const here = running.filter((x) => x.s.location_id === loc.id);
          return (
            <li
              key={loc.id}
              className={`flex min-h-[96px] flex-col border-t-2 pt-2 transition-colors duration-300 sm:min-h-[116px] ${
                here.length ? "border-navy" : "border-navy/15"
              }`}
            >
              <h3 className="font-space-mono text-[10.5px] leading-tight font-bold tracking-[0.1em] text-navy uppercase">
                {loc.name}
              </h3>
              <div className="mt-2 flex flex-1 flex-col gap-1.5">
                {here.length ? (
                  here.map(({ s }) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        dispatch({ type: "pause" });
                        setOpen(s);
                      }}
                      style={sessionStyle(s)}
                      className="rounded-md border-[1.5px] px-2 py-1.5 text-left text-[#1b1530] transition-transform duration-300 hover:-translate-y-0.5 motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:fade-in"
                    >
                      <span className="line-clamp-2 text-[13px] leading-tight font-semibold">
                        {s.title}
                      </span>
                      <span className="mt-0.5 block font-space-mono text-[10px] text-[#1b1530]/75">
                        until {formatPacificTime(s.end_time)}
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="font-space-mono text-[11px] tracking-[0.12em] text-ink/35 uppercase">
                    Quiet
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <LastYearSessionModal
          session={open}
          dayName={d.name}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
