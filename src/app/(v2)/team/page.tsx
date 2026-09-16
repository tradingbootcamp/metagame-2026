import type { Metadata } from "next";
import ContentPage from "@/v2/components/ContentPage";
import PersonCard from "@/v2/components/PersonCard";
import { HEADING } from "@/v2/components/styles";
import { Button } from "@/v2/components/ui/button";
import { ADVISORS, TEAM } from "@/v2/data/team";
import { JOIN_TEAM_FORM_URL } from "@/v2/lib/links";

export const metadata: Metadata = {
  title: "Team — Metagame 2026",
  description: "The people running Metagame 2026.",
};

export default function TeamPage() {
  return (
    <ContentPage
      eyebrow="Who's behind this?"
      title="The team"
      intro={
        <p>
          Metagame is run by a small group of game-lovers and powered by
          countless volunteers. Here are some of our faces.
        </p>
      }
    >
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((person) => (
          <li key={person.name}>
            <PersonCard {...person} />
          </li>
        ))}
      </ul>

      <h2
        className={`${HEADING} mt-16 mb-6 text-[clamp(24px,3vw,34px)] text-navy`}
      >
        Advisors
      </h2>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ADVISORS.map((person) => (
          <li key={person.name}>
            <PersonCard {...person} />
          </li>
        ))}
      </ul>

      <p className={`${HEADING} mt-16 text-[clamp(24px,3vw,34px)] text-navy`}>
        Want to join the team? Let us know here:
      </p>
      <Button asChild variant="navy" size="lg" className="mt-6 text-lg">
        <a href={JOIN_TEAM_FORM_URL} target="_blank" rel="noopener noreferrer">
          Get involved
        </a>
      </Button>
    </ContentPage>
  );
}
