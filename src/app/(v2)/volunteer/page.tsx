import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/v2/components/ContentPage";
import { EYEBROW, HEADING } from "@/v2/components/styles";
import { Button } from "@/v2/components/ui/button";
import VolunteerFormLink from "@/v2/components/VolunteerFormLink";
import { upcomingKeyDates } from "@/v2/data/key-dates";
import {
  VOLUNTEER_TEAMS,
  WHEN_LABEL,
  type VolunteerTeam,
} from "@/v2/data/volunteer-teams";
import { VOLUNTEER_FORM_PATH } from "@/v2/lib/links";

// Hourly, so the deadline line flips once applications close.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Volunteer — Metagame 2026",
  description:
    "Help make Metagame 2026: some teams need help now, before the con, and others on the weekend of Nov 6–8.",
};

const CARD =
  "rounded-2xl border border-navy/[0.16] bg-white p-6 shadow-[0_8px_24px_rgba(23,48,89,0.08)]";

function TeamList({ teams }: { teams: VolunteerTeam[] }) {
  return (
    <ul className="mt-5 space-y-4">
      {teams.map((team) => (
        <li key={team.name}>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className={`font-semibold ${team.color}`}>{team.name}</span>
            {team.when === "both" && (
              <span className="font-space-mono text-[11px] tracking-[0.08em] text-ink/50 uppercase">
                {WHEN_LABEL.both}
              </span>
            )}
          </p>
          <p className="text-[15px] text-ink/70">{team.blurb}</p>
        </li>
      ))}
    </ul>
  );
}

export default function VolunteerPage() {
  const deadline = upcomingKeyDates().find(
    (d) => d.href === VOLUNTEER_FORM_PATH,
  );
  // Teams that only need help at that time first, then the "both" ones.
  const column = (when: "now" | "weekend") => [
    ...VOLUNTEER_TEAMS.filter((t) => t.when === when),
    ...VOLUNTEER_TEAMS.filter((t) => t.when === "both"),
  ];
  const now = column("now");
  const weekend = column("weekend");
  return (
    <ContentPage
      eyebrow="Help make Metagame"
      title="Volunteer"
      intro={
        <>
          <p>
            Metagame is made by the people who show up. Some teams need help
            right now, weeks before the gates open. Others need you on the
            weekend itself. A limited number of volunteer tickets are available.
          </p>
          {deadline && (
            <p className="mt-3">
              Applications close{" "}
              <strong className="font-semibold text-navy">
                {deadline.label}
              </strong>
              .
            </p>
          )}
          {deadline && (
            <Button asChild variant="default" className="mt-5">
              <VolunteerFormLink>Apply to volunteer</VolunteerFormLink>
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <section className={CARD}>
          <p className={`${EYEBROW} text-sm text-meeple`}>Before the con</p>
          <h2 className={`${HEADING} mt-1 text-2xl text-navy`}>
            Start helping now
          </h2>
          <TeamList teams={now} />
        </section>
        <section className={CARD}>
          <p className={`${EYEBROW} text-sm text-meeple`}>Nov 6–8</p>
          <h2 className={`${HEADING} mt-1 text-2xl text-navy`}>
            Help on the weekend
          </h2>
          <TeamList teams={weekend} />
        </section>
      </div>

      <section className="mt-6 rounded-2xl bg-navy p-6 text-cream shadow-[0_8px_24px_rgba(23,48,89,0.08)]">
        <h2 className={`${HEADING} text-2xl`}>No application needed</h2>
        <p className="mt-2 max-w-[640px] text-[15px] text-cream/80">
          You can help today: put up a poster in your neighborhood, or share the
          dice poster (it hides $20 off a ticket) with your group chat.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="default">
            <Link href="/posters">Print a poster</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/poster">Share the dice poster</Link>
          </Button>
        </div>
      </section>

      <section className="mt-12">
        <h2 className={`${HEADING} text-2xl text-navy`}>How it works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["Apply", "Tell us which teams you'd like and when you're free."],
            [
              "Get matched",
              "We'll get back to you and point you to your team on Discord.",
            ],
            ["Play your part", "Help out, then enjoy the rest of the con."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span
                className={`${HEADING} flex size-9 shrink-0 items-center justify-center rounded-full bg-meeple text-lg text-white`}
              >
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-navy">{title}</p>
                <p className="text-[15px] text-ink/70">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </ContentPage>
  );
}
