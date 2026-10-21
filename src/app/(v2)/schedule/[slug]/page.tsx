import type { Metadata } from "next";
import RouteModal from "@/v2/components/RouteModal";
import SessionDetails, {
  sessionMetadata,
  SESSION_TITLE_ID,
} from "@/v2/components/schedule/SessionDetails";
import { prelaunchGate } from "../data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await prelaunchGate();
  return sessionMetadata((await params).slug);
}

export default async function SessionPage({ params }: Props) {
  await prelaunchGate();
  return (
    <RouteModal labelledBy={SESSION_TITLE_ID}>
      <SessionDetails slug={(await params).slug} />
    </RouteModal>
  );
}
