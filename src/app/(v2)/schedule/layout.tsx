import { buildDays } from "@/lib/schedule";
import ContentPage from "@/v2/components/ContentPage";
import { ModalHost } from "@/v2/components/RouteModal";
import PublicSchedule from "@/v2/components/schedule/PublicSchedule";
import AccountWall from "@/v2/components/AccountWall";
import {
  loadBoard,
  loadMySessionIds,
  loadPublicSchedule,
  scheduleGate,
} from "./data";

const CLOSED =
  "The schedule isn’t public yet. Session hosts and the Metagame team can preview it — if you’re one of them and this is all you see, ask us to turn it on for your account.";
const SIGNED_OUT =
  "The schedule isn’t public yet. If you’re a session host or on the Metagame team, sign in to preview it.";

// The schedule stays mounted under /schedule/<slug>, whose page is just the
// session modal on top of it.
export default async function ScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await scheduleGate();
  if (gate !== "ok") {
    return (
      <AccountWall
        title="Schedule"
        body={gate === "closed" ? CLOSED : SIGNED_OUT}
        next={gate === "signed-out" ? "/schedule" : null}
      />
    );
  }
  const [{ locations, sessions }, board, mine] = await Promise.all([
    loadPublicSchedule(),
    loadBoard(),
    loadMySessionIds(),
  ]);
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
        <PublicSchedule
          days={buildDays(sessions)}
          locations={locations}
          board={board}
          mine={mine}
        />
      </ContentPage>
      {children}
    </ModalHost>
  );
}
