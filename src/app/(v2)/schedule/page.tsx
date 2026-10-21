import type { Metadata } from "next";
import { buildDays } from "@/lib/schedule";
import ContentPage from "@/v2/components/ContentPage";
import PublicSchedule from "@/v2/components/schedule/PublicSchedule";
import { loadPublicSchedule, prelaunchGate } from "./data";

export const metadata: Metadata = {
  title: "Schedule — Metagame 2026",
  robots: { index: false },
};

export default async function SchedulePage() {
  await prelaunchGate();
  const { locations, sessions } = await loadPublicSchedule();
  return (
    <ContentPage
      eyebrow="Nov 6–8 at Lighthaven"
      title="Schedule"
      intro={
        <p>
          Talks, workshops and games across three days. Tap any session for
          details.
        </p>
      }
      wide
    >
      <PublicSchedule days={buildDays(sessions)} locations={locations} />
    </ContentPage>
  );
}
