import type { Metadata } from "next";
import RouteModal from "@/v2/components/RouteModal";
import SessionDetails, {
  sessionMetadata,
  SESSION_TITLE_ID,
} from "@/v2/components/schedule/SessionDetails";
import { scheduleGate } from "../data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if ((await scheduleGate()) !== "ok") return { robots: { index: false } };
  return sessionMetadata((await params).slug);
}

export default async function SessionPage({ params }: Props) {
  // The layout shows the wall; the modal just doesn't open over it.
  if ((await scheduleGate()) !== "ok") return null;
  return (
    <RouteModal labelledBy={SESSION_TITLE_ID}>
      <SessionDetails slug={(await params).slug} />
    </RouteModal>
  );
}
