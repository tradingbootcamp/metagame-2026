import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Night Market booth application — Metagame 2026",
  description:
    "Apply to run a booth at the Metagame Night Market, Friday, Nov 6, 7–10 pm, open to the public.",
};

export default function NightMarketApplyPage() {
  return <AccountJourney slug="night-market" />;
}
