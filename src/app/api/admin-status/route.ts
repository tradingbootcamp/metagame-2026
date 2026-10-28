import { teamAccess } from "@/lib/access";
import { accountsConfigured, currentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Whether a visitor is signed in, and whether their account holds a team-tool
 * permission; lets the static site nav pick its account link and show
 * Backstage.
 */
export async function GET() {
  const [signedIn, access] = accountsConfigured()
    ? await Promise.all([currentSession().catch(() => null), teamAccess()])
    : [null, null];
  return Response.json(
    { signedIn: Boolean(signedIn), admin: Boolean(access?.team) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
