import { NextResponse } from "next/server";
import { volunteerFormUrl } from "@/lib/volunteer-form";

// Short link to the volunteer journey, carrying utm_* through.
export function GET(request: Request) {
  return NextResponse.redirect(
    new URL(volunteerFormUrl(new URL(request.url).searchParams), request.url),
    { status: 302, headers: { "Cache-Control": "no-store" } },
  );
}
