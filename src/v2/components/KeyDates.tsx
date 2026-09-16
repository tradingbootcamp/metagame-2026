import Link from "next/link";
import {
  todayLabel,
  upcomingKeyDates,
  type KeyDate,
} from "@/v2/data/key-dates";
import { HEADING } from "./styles";

type Stop = KeyDate & { today?: boolean; next?: boolean };

// The road from today to the con. A vertical rail on small screens; from lg
// up one horizontal rail with the stops alternating above and below it so
// neighbouring titles don't crowd each other. The first stop is today; passed
// deadlines drop off, and the next one up takes the meeple accent.
export default function KeyDates() {
  const upcoming = upcomingKeyDates();
  const stops: Stop[] = [
    { label: "Today", title: todayLabel(), endsAt: Infinity, today: true },
    ...upcoming.map((d, i) => ({ ...d, next: i === 0 })),
  ];

  return (
    // Three subgrid rows (above / rail / below) shared by every stop, so the
    // rail sits at one height however tall the text above it gets.
    <ol
      className="relative lg:grid lg:grid-rows-[auto_1.5rem_auto]"
      // Column count follows the stops left, so the rail always fills the width.
      style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}
    >
      {stops.map((d, i) => {
        const above = i % 2 === 0;
        const accent = d.next || d.milestone;
        const dot = d.today
          ? "border-navy bg-navy"
          : d.milestone
            ? "border-meeple bg-meeple"
            : d.next
              ? "border-meeple bg-background ring-4 ring-meeple/20"
              : "border-navy bg-background";
        const external = d.href?.startsWith("http");

        return (
          <li
            key={d.label}
            // Small screens: the ::before is the vertical rail down the left
            // (hidden on the last stop). From lg the li spans the subgrid rows
            // and the rail moves to the dot row below.
            className="group relative pb-8 pl-10 before:absolute before:top-3 before:-bottom-2 before:left-[9px] before:w-0.5 before:bg-navy/15 last:pb-0 last:before:hidden lg:row-span-full lg:grid lg:grid-rows-subgrid lg:pb-0 lg:pl-0 lg:text-center lg:before:hidden"
          >
            {/* Dot row. From lg its ::before is the horizontal rail, cut to
                half-width on the first and last stops. */}
            <div className="absolute top-[3px] left-0 lg:relative lg:top-auto lg:left-auto lg:row-start-2 lg:flex lg:items-center lg:justify-center lg:before:absolute lg:before:inset-x-0 lg:before:top-1/2 lg:before:h-0.5 lg:before:-translate-y-1/2 lg:before:bg-navy/15 lg:group-first:before:left-1/2 lg:group-last:before:right-1/2">
              <span
                aria-hidden
                className={`relative z-10 block rounded-full border-2 ${dot} ${
                  d.milestone ? "size-5 lg:size-6" : "size-5"
                }`}
              />
            </div>
            <div
              className={`lg:px-2 ${
                above
                  ? "lg:row-start-1 lg:self-end lg:pb-3"
                  : "lg:row-start-3 lg:self-start lg:pt-3"
              }`}
            >
              <p
                className={`font-space-mono text-xs tracking-[0.12em] uppercase ${
                  accent ? "text-meeple" : "text-navy"
                }`}
              >
                {d.label}
              </p>
              <p
                className={`${HEADING} mt-1 text-[17px] text-balance ${
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
                <p className="mt-1.5 text-sm font-semibold text-meeple">
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
                    <Link
                      href={d.href}
                      className="underline underline-offset-2"
                    >
                      {d.cta}
                    </Link>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
