import type { Metadata } from "next";
import { prelaunchGate } from "@/app/(v2)/schedule/data";
import RouteModal from "@/v2/components/RouteModal";
import SessionDetails, {
  sessionMetadata,
} from "@/v2/components/schedule/SessionDetails";

type Props = { params: Promise<{ slug: string }> };

const TITLE_ID = "session-modal-title";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await prelaunchGate();
  return sessionMetadata((await params).slug);
}

export default async function SessionModal({ params }: Props) {
  await prelaunchGate();
  const { slug } = await params;
  return (
    <RouteModal labelledBy={TITLE_ID}>
      <SessionDetails slug={slug} titleId={TITLE_ID} />
    </RouteModal>
  );
}
