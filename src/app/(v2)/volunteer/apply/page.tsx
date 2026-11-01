import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Volunteer application — Metagame 2026",
  description:
    "Apply to volunteer at Metagame 2026, Nov 6–8 at Lighthaven, Berkeley. Limited $0 volunteer tickets.",
};

export default function VolunteerApplyPage() {
  return <AccountJourney slug="volunteer" />;
}
