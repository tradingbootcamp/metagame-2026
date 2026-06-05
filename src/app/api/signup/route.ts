import { NextResponse } from "next/server";
import { recordSignup } from "@/lib/airtable";

export async function POST(request: Request) {
  let body: { email?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { email, name } = body;
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const trimmedName = typeof name === "string" ? name.trim() : "";

  try {
    const result = await recordSignup(email.trim(), trimmedName || undefined);
    return NextResponse.json({ ok: true, stored: result.stored });
  } catch (err) {
    console.error("[signup] failed to store email:", err);
    return NextResponse.json(
      { error: "Failed to save signup" },
      { status: 500 },
    );
  }
}
