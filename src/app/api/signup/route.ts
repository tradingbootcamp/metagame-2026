import { NextResponse } from "next/server";
import { recordSignup } from "@/lib/airtable";

export async function POST(request: Request) {
  let body: { email?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, name } = body;
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const trimmedName = typeof name === "string" ? name.trim() : "";

  try {
    const result = await recordSignup(email.trim(), trimmedName || undefined);
    // In dev the not-configured no-op is intentional, but in production it means
    // misconfigured env (missing PAT) — surface it instead of faking success and
    // silently dropping the signup.
    if (!result.stored && process.env.NODE_ENV === "production") {
      console.error("[signup] Airtable not configured in production — signup not stored");
      return NextResponse.json(
        { error: "Signup is temporarily unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, stored: result.stored });
  } catch (err) {
    console.error("[signup] failed to store email:", err);
    return NextResponse.json({ error: "Failed to save signup" }, { status: 500 });
  }
}
