import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Propose a session — Metagame 2026",
  description:
    "Pitch a talk, game, workshop or something stranger for Metagame 2026, Nov 6–8 at Lighthaven, Berkeley.",
};

export default function ProposePage() {
  return <AccountJourney slug="propose" />;
}
