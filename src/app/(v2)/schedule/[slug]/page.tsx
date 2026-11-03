import type { Metadata } from "next";
import SessionDetails, {
  sessionMetadata,
} from "@/v2/components/schedule/SessionDetails";
import SessionModal, {
  SESSION_TITLE_ID,
} from "@/v2/components/schedule/SessionModal";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return sessionMetadata((await params).slug);
}

// The session's own, shareable page: the schedule on its day with it open.
// In-app links open sessions as ?session=<slug> on the current page instead.
export default async function SessionPage({ params }: Props) {
  return (
    <SessionModal closeHref="/schedule" labelledBy={SESSION_TITLE_ID}>
      <SessionDetails slug={(await params).slug} />
    </SessionModal>
  );
}
