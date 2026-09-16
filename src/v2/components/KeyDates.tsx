import Link from "next/link";
import {
  todayLabel,
  upcomingKeyDates,
  type KeyDate,
} from "@/v2/data/key-dates";
import { HEADING } from "./styles";

type Stop = KeyDate & { today?: boolean; next?: boolean };

// Same drawing as the announcement email's "Key dates": a vertical trunk with
// each stop hanging off it on a short tick, its date in a boxed mono label.
// From md the stops alternate left and right of a centre trunk in staggered
// pairs; below that they all hang to the right of a trunk down the left edge.
// The first stop is today; passed deadlines drop off, and the next one up
// takes the meeple accent.
export default function KeyDates() {
  const upcoming = upcomingKeyDates();
  const stops: Stop[] = [
    { label: "Today", title: todayLabel(), endsAt: Infinity, today: true },
    ...upcoming.map((d, i) => ({ ...d, next: i === 0 })),
  ];

  return (
    // The ol's ::before is the trunk.
    <ol className="relative mx-auto max-w-[760px] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-navy/15 md:grid md:grid-cols-2 md:before:left-1/2 md:before:-translate-x-1/2">
      {stops.map((d, i) => {
        const left = i % 2 === 0;
        const accent = d.next || d.milestone;
        const external = d.href?.startsWith("http");

        return (
          <li
            key={d.label}
            // Second of each pair sits lower so the boxes stagger down the
            // trunk instead of facing each other. The ::before is the tick.
            className={`relative pb-6 pl-7 before:absolute before:top-[12px] before:h-0.5 before:w-7 before:bg-navy/15 last:pb-0 md:pl-0 md:before:w-4 ${
              left
                ? "md:col-start-1 md:pr-4 md:text-right md:before:right-0"
                : "md:col-start-2 md:pt-7 md:pl-4 md:before:top-10 md:before:left-0"
            }`}
            style={{ gridRow: Math.floor(i / 2) + 1 }}
          >
            <p
              className={`inline-block border-2 border-navy/15 px-2 py-px font-space-mono text-[13px] font-bold tracking-[0.08em] uppercase ${
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
