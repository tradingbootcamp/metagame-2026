import Link from "next/link";
import {
  todayLabel,
  upcomingKeyDates,
  type KeyDate,
} from "@/v2/data/key-dates";
import { HEADING } from "./styles";

type Stop = KeyDate & { today?: boolean; next?: boolean };

// A trunk segment, centred on the column edge that meets the trunk.
const TRUNK =
  "absolute top-[12px] bottom-0 w-[3px] group-[.left]:right-0 group-[.left]:translate-x-1/2 group-[.right]:left-0 group-[.right]:-translate-x-1/2";

// Same drawing as the announcement email's "Key dates": a vertical trunk with
// each stop hanging off it on a short tick, its date in a boxed mono label.
// From md the stops alternate left and right of a centre trunk; below that
// they all hang to the right of a trunk down the left edge. The first stop is
// today; passed deadlines drop off, and the next one up takes the meeple accent.
//
// Each stop starts one grid row after the previous and spans two, so the
// sides interleave: a stop begins level with the middle of the one across
// from it.
export default function KeyDates() {
  const upcoming = upcomingKeyDates();
  const stops: Stop[] = [
    { label: "Today", title: todayLabel(), endsAt: Infinity, today: true },
    ...upcoming.map((d, i) => ({ ...d, next: i === 0 })),
  ];

  const milestone = stops.findIndex((d) => d.milestone);

  return (
    // The ol's ::after is the bulb at the top of the trunk; each stop draws
    // the trunk from its own tick down to its bottom, so the trunk can end
    // in a second bulb at the con and fade out as dashes to the stop after.
    <ol className="relative mx-auto grid max-w-[760px] grid-cols-2 gap-y-5 after:absolute after:top-1 after:left-1/2 after:size-4 after:-translate-x-1/2 after:rounded-full after:border-[3px] after:border-rail after:bg-background">
      {stops.map((d, i) => {
        const left = i % 2 === 0;
        const accent = d.next || d.milestone;
        const external = d.href?.startsWith("http");

        return (
          <li
            key={d.label}
            // The ::before is the tick.
            className={`group relative pb-2 pl-0 before:absolute before:top-[12px] before:left-0 before:h-0.5 before:w-4 before:bg-rail last:pb-0 ${
              left
                ? "left col-start-1 pr-4 text-right before:right-0 before:left-auto"
                : "right col-start-2 pl-4 before:left-0"
            }`}
            style={{ gridRow: `${i + 1} / span 2` }}
          >
            {(milestone < 0 || i < milestone) && (
              <span aria-hidden className={`${TRUNK} bg-rail`} />
            )}
            {i === milestone && (
              <>
                <span
                  aria-hidden
                  className={`${TRUNK} w-[5px] bg-background`}
                />
                <span
                  aria-hidden
                  className={`${TRUNK} bg-[repeating-linear-gradient(to_bottom,var(--color-rail)_0_6px,transparent_6px_12px)] [mask-image:linear-gradient(to_bottom,black,transparent)]`}
                />
                <span
                  aria-hidden
                  className={`absolute top-1 size-4 rounded-full border-[3px] border-rail bg-background ${
                    left ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
                  }`}
                />
              </>
            )}
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
