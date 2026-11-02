import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Sponsor interest — Metagame 2026",
  description:
    "Interested in sponsoring Metagame 2026? Tell us a little and we'll reach out.",
};

export default function SponsorInterestPage() {
  return <AccountJourney slug="sponsor" />;
}
