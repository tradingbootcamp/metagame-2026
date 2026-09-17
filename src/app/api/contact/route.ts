import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";
import { ADVISORS, TEAM } from "@/v2/data/team";
import { TEAM_EMAIL } from "@/v2/lib/links";

// Addresses the form may deliver to: the team inbox plus anyone listed with an
// email on /team. Anything else is rejected so the endpoint can't be used as
// an open relay.
const ALLOWED_RECIPIENTS = new Set([
  TEAM_EMAIL,
  ...[...TEAM, ...ADVISORS].flatMap((p) => (p.email ? [p.email] : [])),
]);

const MAX = { name: 200, email: 254, subject: 200, message: 5000 };

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Honeypot: real users never see this field, so a filled value is a bot.
  // Answer as if it worked so the bot has nothing to adapt to.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const name = str(body.name, MAX.name);
  const email = str(body.email, MAX.email);
  const subject = str(body.subject, MAX.subject);
  const message = str(body.message, MAX.message);
  const to = str(body.to, MAX.email) || TEAM_EMAIL;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (!ALLOWED_RECIPIENTS.has(to)) {
    return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
  }

  try {
    const sent = await sendContactEmail({ to, name, email, subject, message });
    // Not sent in prod = misconfigured env; error instead of faking success.
    if (!sent && process.env.NODE_ENV === "production") {
      console.error("[contact] Resend not configured in production");
      return NextResponse.json(
        { error: "Contact form is temporarily unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[contact] failed to send:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
