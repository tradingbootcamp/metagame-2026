import Link from "next/link";
import VolunteerFormLink from "@/v2/components/VolunteerFormLink";
import { todayLabel, upcomingTurns } from "@/v2/data/key-dates";
import { VOLUNTEER_FORM_PATH } from "@/v2/lib/links";
import { DISPLAY } from "./styles";

// §4 of the rulebook: a single rail down the left, one turn per row with its
// date beside it (stacked on phones). It starts at today; passed turns drop
// off, the next deadline takes the meeple dot, and the con's opening beat is
// the milestone.
export default function TurnOrder() {
  const turns = upcomingTurns();
  const next = turns.findIndex((d) => d.href);
  return (
    <div className="relative">
      {/* The rail draws itself down the page as the chapter scrolls by. */}
      <span
        aria-hidden
        className="rulebook-draw absolute inset-y-0 left-0 w-[3px] bg-navy"
      />
      <ol className="border-l-[3px] border-navy/15">
        <Turn when={`Today · ${todayLabel()}`} dot="bg-navy border-navy" ping>
          <h3 className={`${DISPLAY} text-[26px] leading-[1.05] text-navy`}>
            Your turn
          </h3>
        </Turn>
        {turns.map((d, i) => {
          const external = d.href?.startsWith("http");
          return (
            <Turn
              key={d.label}
              when={d.label}
              dot={
                d.milestone || i === next
                  ? "bg-meeple border-meeple"
                  : "bg-background border-navy"
              }
            >
              <h3
                className={
                  d.aside
                    ? "text-[15px] font-medium text-ink/50 italic"
                    : `${DISPLAY} text-[26px] leading-[1.05] tracking-[0.02em] ${
                        d.milestone ? "text-meeple" : "text-navy"
                      }`
                }
              >
                {d.title}
              </h3>
              {d.body && <p className="text-[15px] text-ink/70">{d.body}</p>}
              {d.href && d.cta && (
                <p className="mt-1 text-sm font-semibold text-meeple">
                  {d.href === VOLUNTEER_FORM_PATH ? (
                    <VolunteerFormLink className="underline underline-offset-2">
                      {d.cta}
                    </VolunteerFormLink>
                  ) : external ? (
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
            </Turn>
          );
        })}
      </ol>
    </div>
  );
}

function Turn({
  when,
  dot,
  ping = false,
  children,
}: {
  when: string;
  /** Background and border classes for the rail dot. */
  dot: string;
  /** A ring that keeps pulsing out of the dot: you are here. */
  ping?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative grid gap-0.5 border-b border-line py-3.5 pl-6 md:grid-cols-[190px_minmax(0,1fr)] md:gap-5">
      {ping && (
        <span
          aria-hidden
          className="absolute top-[21px] -left-[9px] size-[15px] rounded-full bg-navy/40 motion-safe:animate-ping"
        />
      )}
      <span
        aria-hidden
        className={`absolute top-[21px] -left-[9px] size-[15px] rounded-full border-[3px] ${dot}`}
      />
      <span className="font-space-mono text-[13px] leading-[1.6] font-bold tracking-[0.08em] text-navy uppercase">
        {when}
      </span>
      <div>{children}</div>
    </li>
  );
}
