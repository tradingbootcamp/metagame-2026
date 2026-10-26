import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/admin-auth";
import { siteOrigin } from "@/lib/site-origin";
import { connect, STATE_COOKIE } from "@/lib/xero";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const back = (q: string) => {
    const res = NextResponse.redirect(`${origin}/backstage/budget?${q}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/budget/xero" });
    return res;
  };
  const access = await requireAccess("budget.manage");
  if (!access) return back("xero=forbidden");

  const { searchParams } = request.nextUrl;
  const state = searchParams.get("state");
  const code = searchParams.get("code");
  if (!code || !state || state !== request.cookies.get(STATE_COOKIE)?.value) {
    return back(
      "xero=error&message=" + encodeURIComponent("State mismatch. Try again."),
    );
  }
  try {
    const tenant = await connect(
      code,
      `${origin}/api/budget/xero/callback`,
      access.name,
    );
    return back("xero=connected&org=" + encodeURIComponent(tenant.tenantName));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return back("xero=error&message=" + encodeURIComponent(message));
  }
}
