"use server";

import type { ReactNode } from "react";
import SessionDetails, {
  lookupSession,
} from "@/v2/components/schedule/SessionDetails";

/**
 * The session modal's body for the page it opened over, rendered on the
 * server with the viewer's own plans; null when there's no such session.
 */
export async function sessionDetails(slug: string): Promise<ReactNode> {
  if (!(await lookupSession(slug))) return null;
  return <SessionDetails slug={slug} />;
}
