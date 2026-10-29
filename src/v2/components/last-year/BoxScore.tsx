import type { CSSProperties } from "react";
import {
  days,
  hostNames,
  scheduleLocations,
} from "@/v2/lib/last-year-schedule";
import { DISPLAY, TOKEN } from "../styles";

const SESSIONS = days.flatMap((d) => d.sessions);
const count = (category: string) =>
  SESSIONS.filter((s) => s.category === category).length;

// 2025 in numbers, every one counted from the 2025 schedule snapshot.
const STATS = [
  { label: "Sessions", value: SESSIONS.length },
  { label: "Session hosts", value: new Set(SESSIONS.flatMap(hostNames)).size },
  { label: "Games", value: count("game") },
  { label: "Talks", value: count("talk") },
  { label: "Workshops", value: count("workshop") },
  { label: "Venues", value: scheduleLocations.length },
];

// The two megagame teams, in the schedule's megagame stripe colours.
const TEAMS = [
  { name: "Purple", bg: "#cbb6ec" },
  { name: "Orange", bg: "#eaa35a" },
];

// The 2025 edition's box back, laid straight on the page: the final box
// score, each number counting up as the page opens, and the two teams.
export default function BoxScore() {
  return (
    <aside aria-label="Metagame 2025 in numbers">
      <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
        Box score · Final
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 border-t-2 border-navy sm:grid-cols-3">
        {STATS.map(({ label, value }, i) => (
          <div key={label} className="border-b border-navy/15 py-3">
            <dt className="font-space-mono text-[10.5px] font-bold tracking-[0.14em] text-ink/60 uppercase">
              {label}
            </dt>
            <dd
              className={`${DISPLAY} mt-1 text-[clamp(40px,4.4vw,56px)] leading-none tracking-[0.02em] text-navy`}
            >
              <span className="sr-only">{value}</span>
              <span
                aria-hidden
                className="count-up"
                style={
                  {
                    "--to": value,
                    animationDelay: `${150 + i * 90}ms`,
                  } as CSSProperties
                }
              />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
        Teams
      </p>
      <div className="mt-2.5 flex items-center gap-4">
        {TEAMS.map((t, i) => (
          <span key={t.name} className="contents">
            {i > 0 && (
              <span className="font-space-mono text-xs text-ink/55 uppercase">
                vs
              </span>
            )}
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className={`${TOKEN} size-9 border-2 border-navy`}
                style={{ background: t.bg }}
              />
              <span
                className={`${DISPLAY} text-[30px] leading-none tracking-[0.04em] text-navy`}
              >
                {t.name}
              </span>
            </span>
          </span>
        ))}
      </div>
    </aside>
  );
}
