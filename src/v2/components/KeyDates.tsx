import Link from "next/link";
import {
  daysUntil,
  todayLabel,
  upcomingKeyDates,
  type KeyDate,
} from "@/v2/data/key-dates";
import { HEADING } from "./styles";

type Stop = KeyDate & { day: number; today?: boolean; next?: boolean };

// Same drawing as the announcement email's "Key dates": a vertical trunk with
// each stop hanging off it on a short tick, its date in a boxed mono label.
// From md the stops alternate left and right of a centre trunk; below that
// they all hang to the right of a trunk down the left edge. The first stop is
// today; passed deadlines drop off, and the next one up takes the meeple accent.
//
// Spacing is roughly proportional to time: one grid row per day (gaps longer
// than MAX_GAP days are shortened to it) with a minimum height, each stop
// starting on its day's row and spanning to the next stop that could collide
// with it (the next one on its own side from md, since the
// sides are separate columns). Rows only grow past the minimum when a stop's
// text needs the room.
export default function KeyDates() {
  const upcoming = upcomingKeyDates();
  const stops: Stop[] = [
    {
      label: "Today",
      title: todayLabel(),
      endsAt: Infinity,
      day: 0,
      today: true,
    },
    ...upcoming.map((d, i) => ({
      ...d,
      day: daysUntil(d.endsAt),
      next: i === 0,
    })),
  ];
  const lastDay = stops[stops.length - 1].day;

  return (
    // The ol's ::before is the trunk.
    <ol
      className="relative mx-auto grid max-w-[760px] [--day:10px] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-rail md:grid-cols-2 md:[--day:12px] md:before:left-1/2 md:before:-translate-x-1/2"
      style={{
        gridTemplateRows: `repeat(${lastDay + 1}, minmax(var(--day), auto))`,
      }}
    >
      {stops.map((d, i) => {
        const left = i % 2 === 0;
        const spanTo = (j: number) =>
          Math.max(1, (stops[j]?.day ?? lastDay + 1) - d.day);
        const accent = d.next || d.milestone;
        const external = d.href?.startsWith("http");

        return (
          <li
            key={d.label}
            // The ::before is the tick.
            className={`relative [grid-row:var(--row)] pb-6 pl-7 before:absolute before:top-[12px] before:left-0 before:h-0.5 before:w-7 before:bg-rail last:pb-0 md:[grid-row:var(--row-md)] md:pb-2 md:pl-0 md:before:w-4 ${
              left
                ? "md:col-start-1 md:pr-4 md:text-right md:before:right-0 md:before:left-auto"
                : "md:col-start-2 md:pl-4 md:before:left-0"
            }`}
            style={
              {
                "--row": `${d.day + 1} / span ${spanTo(i + 1)}`,
                "--row-md": `${d.day + 1} / span ${spanTo(i + 2)}`,
              } as React.CSSProperties
            }
          >
            <p
              className={`inline-block border-2 border-rail px-2 py-px font-space-mono text-[13px] font-bold tracking-[0.08em] uppercase ${
                d.today
                  ? "border-navy bg-navy text-cream"
                  : accent
                    ? "bg-background text-meeple"
                    : "bg-background text-navy"
              }`}
            >
              {d.label}
            </p>
            <p
              className={`${HEADING} mt-1.5 text-[17px] text-balance ${
                d.aside
                  ? "font-medium text-ink/50 italic"
                  : d.milestone
                    ? "text-xl text-meeple"
                    : "text-navy"
              }`}
            >
              {d.title}
            </p>
            {d.href && d.cta && (
              <p className="mt-1 text-sm font-semibold text-meeple">
                {external ? (
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {d.cta}
                  </a>
                ) : (
                  <Link href={d.href} className="underline underline-offset-2">
                    {d.cta}
                  </Link>
                )}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
