import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Financial aid — Metagame 2026",
  description:
    "Apply for a free or reduced-price ticket to Metagame 2026 from the scholarship fund.",
};

export default function FinancialAidPage() {
  return <AccountJourney slug="financial-aid" />;
}
