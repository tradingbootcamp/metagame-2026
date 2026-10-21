import { listRfpSessions } from "@/lib/rfp-sessions";
import { parseRfpSessionQuery, resolveAccount } from "@/lib/rfp-sessions-api";
import { authorize, error, json } from "@/lib/schedule-api";

export const dynamic = "force-dynamic";

/**
 * Sessions in the RFP pipeline with their hosts, shepherd and grades. Filters:
 * `phase`, `verdict` (comma-separated enum values, "none" for unset),
 * `grader` and `shepherd` (user id or email).
 */
export async function GET(request: Request) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const query = parseRfpSessionQuery(new URL(request.url).searchParams);
  if (!query.ok) return error(query.error, 400, query.field);
  const { grader, shepherd, ...filter } = query.value;

  const [graderUserId, shepherdUserId] = await Promise.all([
    grader ? resolveAccount(grader) : undefined,
    shepherd ? resolveAccount(shepherd) : undefined,
  ]);
  // An unknown account has no sessions.
  if (graderUserId === null || shepherdUserId === null) {
    return json({ sessions: [] });
  }
  const sessions = await listRfpSessions({
    ...filter,
    graderUserId,
    shepherdUserId,
  });
  return json({ sessions });
}
