import { can } from "./access";
import { currentSession } from "./auth";
import { sessionHostIds } from "./schedule-store";

// Who may edit one session. Every other write in this codebase authorizes on
// a permission alone; this is the one place ownership counts, so the rule
// lives here rather than inline in an action.

export type SessionEditor =
  | { userId: string; via: "team" }
  | { userId: string; via: "host" };

/** The rule itself, pure so it can be tested without a database. */
export function sessionEditor(
  viewerId: string | null,
  hostIds: readonly string[],
  isTeam: boolean,
): SessionEditor | null {
  if (!viewerId) return null;
  if (isTeam) return { userId: viewerId, via: "team" };
  return hostIds.includes(viewerId) ? { userId: viewerId, via: "host" } : null;
}

/** How this request may edit `sessionId`, or null. */
export async function editSessionAccess(
  sessionId: string,
): Promise<SessionEditor | null> {
  const [session, team, hostIds] = await Promise.all([
    currentSession(),
    can("schedule.manage"),
    sessionHostIds(sessionId),
  ]);
  return sessionEditor(session?.user.id ?? null, hostIds, !!team);
}
