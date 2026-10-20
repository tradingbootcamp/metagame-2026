import { authorize, error, json, sessionBySlug } from "@/lib/schedule-api";
import { loadSessionPlans } from "@/lib/schedule-store";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/schedule/sessions/[slug]/bookmarks">;

export async function GET(_request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const session = await sessionBySlug((await ctx.params).slug);
  if (!session) return error("No such session.", 404);
  const { bookmarkedBy } = await loadSessionPlans(session.id);
  return json({ bookmarkedBy });
}
