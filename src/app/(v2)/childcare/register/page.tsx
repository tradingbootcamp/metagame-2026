import type { Metadata } from "next";
import AccountJourney from "@/v2/components/journey/AccountJourney";

export const metadata: Metadata = {
  title: "Register your children — Metagame 2026",
  description:
    "Register every child coming to Metagame 2026. Under 13 is free, with free childcare for ages 5–12.",
};

export default function ChildRegistrationPage() {
  return <AccountJourney slug="children" />;
}
