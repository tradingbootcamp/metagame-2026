import { NextResponse, type NextRequest } from "next/server";
import { referralRedirectPath } from "@/lib/referral-codes";

// A redirect, not a rewrite: UtmCapture and PostHog read the browser's URL.
export function proxy(request: NextRequest) {
  const code = request.nextUrl.pathname.split("/")[2] ?? "";
  return NextResponse.redirect(
    new URL(referralRedirectPath(code), request.url),
    302,
  );
}

export const config = {
  matcher: "/r/:code",
};
