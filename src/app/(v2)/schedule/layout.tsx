import { buildDays } from "@/lib/schedule";
import ContentPage from "@/v2/components/ContentPage";
import { ModalHost } from "@/v2/components/RouteModal";
import PublicSchedule from "@/v2/components/schedule/PublicSchedule";
import { loadPublicSchedule, prelaunchGate } from "./data";

// The schedule stays mounted under /schedule/<slug>, whose page is just the
// session modal on top of it.
export default async function ScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await prelaunchGate();
  const { locations, sessions } = await loadPublicSchedule();
  return (
    <ModalHost closeHref="/schedule">
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
      {children}
    </ModalHost>
  );
}
