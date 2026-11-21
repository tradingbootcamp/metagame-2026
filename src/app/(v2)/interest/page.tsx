import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Stay in the loop — Metagame 2027",
  description:
    "Join the Metagame mailing list, and tell us if you'd like to volunteer, speak, organize or sponsor.",
};

export default function InterestPage() {
  return <AccountJourney slug="join-team" />;
}
