"use client";

import { useEffect, useReducer } from "react";
import { Pause, Play } from "lucide-react";
import { CONFERENCE_DAYS, opensAt, slotLabel } from "@/lib/schedule";
import type { ClockSession } from "@/v2/lib/schedule-clock";
import { cn } from "@/v2/lib/utils";
import { DISPLAY } from "./styles";

// How far the clock moves per tick of the replay, and how often it ticks.
const STEP = 15;
const TICK_MS = 700;
const MIDNIGHT = 24 * 60;
// Sessions listed under the clock; any more are counted.
const LISTED = 5;

const DOT: Record<string, string> = {
  talk: "bg-sky",
  workshop: "bg-tan",
  game: "bg-moss",
  other: "bg-peach",
};

type State = { day: number; t: number; playing: boolean };
type Action =
  | { type: "tick" | "toggle" | "pause" }
  | { type: "seek"; t: number }
  | { type: "day"; day: number };

const time = (m: number) => slotLabel(m % MIDNIGHT);

// The clock's face: the hour hand and a meeple minute hand. The angles keep
// counting up through the day, so a tick never spins a hand backwards.
function Face({ t }: { t: number }) {
  const hand =
    "transition-transform duration-500 motion-reduce:transition-none";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="size-28 shrink-0">
      <circle
        cx="50"
        cy="50"
        r="46"
        className="fill-background stroke-navy"
        strokeWidth="3"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1={i % 3 ? 10 : 8}
          x2="50"
          y2="15"
          transform={`rotate(${i * 30} 50 50)`}
          className="stroke-navy"
          strokeWidth={i % 3 ? 1.5 : 3}
          strokeLinecap="round"
        />
      ))}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="28"
        className={cn("stroke-navy", hand)}
        strokeWidth="5"
        strokeLinecap="round"
        style={{
          transform: `rotate(${t * 0.5}deg)`,
          transformOrigin: "50% 50%",
        }}
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="17"
        className={cn("stroke-meeple", hand)}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ transform: `rotate(${t * 6}deg)`, transformOrigin: "50% 50%" }}
      />
      <circle cx="50" cy="50" r="4" className="fill-navy" />
    </svg>
  );
}

// §1's clock: the 2026 weekend replayed fifteen minutes at a time, like
// /last-year's instant replay but with a clock in place of its bars. It runs
// on the team's draft schedule (loadClockSessions) and lists what's on at
// each moment.
export default function ScheduleClock({
  sessions,
}: {
  sessions: ClockSession[];
}) {
  const days = CONFERENCE_DAYS.map((d) => {
    const here = sessions.filter((s) => s.day === d.key);
    const end = Math.max(MIDNIGHT, ...here.map((s) => s.end));
    return { ...d, start: opensAt(d.key), end, here };
  });
  const last = days.length - 1;
  const running = (day: number, t: number) =>
    days[day].here.filter((s) => s.start <= t && t < s.end);

  const replay = (s: State, a: Action): State => {
    const clamp = (day: number, t: number) =>
      Math.min(days[day].end - STEP, Math.max(days[day].start, t));
    switch (a.type) {
      case "tick":
        if (s.t + STEP < days[s.day].end) return { ...s, t: s.t + STEP };
        if (s.day < last)
          return { ...s, day: s.day + 1, t: days[s.day + 1].start };
        return { ...s, playing: false };
      case "toggle":
        if (s.playing) return { ...s, playing: false };
        // From the very end, play again from Friday's opening.
        return s.day === last && s.t + STEP >= days[last].end
          ? { day: 0, t: days[0].start, playing: true }
          : { ...s, playing: true };
      case "pause":
        return { ...s, playing: false };
      case "seek":
        return { ...s, t: clamp(s.day, a.t) };
      case "day":
        return { ...s, day: a.day, t: clamp(a.day, s.t) };
    }
  };

  // It opens on Saturday afternoon, in the thick of things.
  const [state, dispatch] = useReducer(replay, {
    day: 1,
    t: 14 * 60,
    playing: false,
  });
  const { day, t, playing } = state;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const d = days[day];
  const on = running(day, t).sort(
    (a, b) => a.start - b.start || a.title.localeCompare(b.title),
  );

  return (
    <div>
      <p className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`${DISPLAY} text-[28px] leading-none tracking-[0.02em] text-navy`}
        >
          The weekend, on the clock
        </span>
        <span className="font-space-mono text-[11px] tracking-[0.12em] text-ink/55 uppercase">
          The 2026 draft schedule · times may move
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t-2 border-navy pt-4">
        <Face t={t} />
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: "toggle" })}
              className={`${DISPLAY} flex items-center gap-2 rounded-xl bg-meeple py-2 pr-4 pl-3.5 text-[21px] leading-none text-cream transition-transform hover:-translate-y-0.5 active:translate-y-0`}
            >
              {playing ? (
                <Pause aria-hidden className="size-4" fill="currentColor" />
              ) : (
                <Play aria-hidden className="size-4" fill="currentColor" />
              )}
              {playing ? "Pause" : "Play"}
            </button>
            <div
              role="group"
              aria-label="Day"
              className="flex overflow-hidden rounded-xl border-2 border-navy"
            >
              {days.map((x, i) => (
                <button
                  key={x.key}
                  type="button"
                  aria-pressed={i === day}
                  onClick={() => dispatch({ type: "day", day: i })}
                  className={cn(
                    `${DISPLAY} px-3 py-1.5 text-[19px] leading-none tracking-[0.04em] transition-colors`,
                    i === day ? "bg-navy text-cream" : "text-navy hover:bg-sky",
                  )}
                >
                  {x.name.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span
              className={`${DISPLAY} text-[clamp(26px,3vw,34px)] leading-none text-navy`}
            >
              {d.name} · {time(t)}
            </span>
            <span className="font-space-mono text-[11px] tracking-[0.1em] text-ink/60 uppercase">
              {on.length} on
            </span>
          </p>
          <input
            type="range"
            min={d.start}
            max={d.end - STEP}
            step={STEP}
            value={t}
            onChange={(e) => {
              dispatch({ type: "pause" });
              dispatch({ type: "seek", t: Number(e.target.value) });
            }}
            aria-label={`Time of day, ${d.name}`}
            aria-valuetext={`${d.name} ${time(t)}, ${on.length} on`}
            className="mt-3 w-full cursor-pointer accent-meeple"
          />
        </div>
      </div>
      <ul className="mt-3 divide-y divide-navy/10 border-b border-navy/15">
        {on.slice(0, LISTED).map((s) => (
          <li
            key={s.id}
            className="flex animate-in items-center gap-2.5 py-1.5 duration-300 fade-in"
          >
            <span
              aria-hidden
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                DOT[s.category ?? "other"] ?? DOT.other,
              )}
            />
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-navy">
              {s.title}
            </span>
            <span className="shrink-0 font-space-mono text-[10.5px] tracking-[0.04em] text-ink/55 uppercase">
              {s.location && `${s.location} · `}until {time(s.end)}
            </span>
          </li>
        ))}
        {!on.length && (
          <li className="py-1.5 text-[14.5px] text-ink/55 italic">
            Between sessions.
          </li>
        )}
      </ul>
      {on.length > LISTED && (
        <p className="mt-1.5 font-space-mono text-[10.5px] tracking-[0.08em] text-ink/55 uppercase">
          And {on.length - LISTED} more
        </p>
      )}
    </div>
  );
}
