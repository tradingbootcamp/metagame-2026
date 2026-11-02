import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Get involved — Metagame 2026",
  description:
    "Volunteer, speak, organize or sponsor: tell us how you'd like to help make Metagame 2026.",
};

export default function JoinTeamPage() {
  return <AccountJourney slug="join-team" />;
}
