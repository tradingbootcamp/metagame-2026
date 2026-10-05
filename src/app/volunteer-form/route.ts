import { NextResponse } from "next/server";
import { volunteerFormUrl } from "@/lib/volunteer-form";

// Short link to the volunteer sign-up Airtable form, carrying utm_* through.
export function GET(request: Request) {
  return NextResponse.redirect(
    volunteerFormUrl(new URL(request.url).searchParams),
    { status: 302, headers: { "Cache-Control": "no-store" } },
  );
}
