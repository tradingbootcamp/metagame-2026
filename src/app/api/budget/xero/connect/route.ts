import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/admin-auth";
import { siteOrigin } from "@/lib/site-origin";
import { authorizeUrl, STATE_COOKIE, xeroConfigured } from "@/lib/xero";

export const dynamic = "force-dynamic";

/** Starts the one-time Xero consent; the callback route finishes it. */
export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const back = (q: string) =>
    NextResponse.redirect(`${origin}/backstage/budget?${q}`);
  if (!(await requireAccess("budget.manage"))) return back("xero=forbidden");
  if (!xeroConfigured()) return back("xero=unconfigured");

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(
    authorizeUrl(`${origin}/api/budget/xero/callback`, state),
  );
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/api/budget/xero",
    maxAge: 600,
  });
  return res;
}
