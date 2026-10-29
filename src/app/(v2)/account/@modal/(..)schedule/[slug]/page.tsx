import type { Metadata } from "next";
import { scheduleGate } from "@/app/(v2)/schedule/data";
import RouteModal from "@/v2/components/RouteModal";
import SessionDetails, {
  sessionMetadata,
  SESSION_TITLE_ID,
} from "@/v2/components/schedule/SessionDetails";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if ((await scheduleGate()) !== "ok") return { robots: { index: false } };
  return sessionMetadata((await params).slug);
}

export default async function SessionModal({ params }: Props) {
  // Nothing to show yet, but /account behind it still renders: a 404 here
  // would take the whole account page with it.
  if ((await scheduleGate()) !== "ok") return null;
  return (
    <RouteModal labelledBy={SESSION_TITLE_ID}>
      <SessionDetails slug={(await params).slug} />
    </RouteModal>
  );
}
