import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// One shared password gets you in; the "I am" dropdown says who you are. Identity
// is therefore self-asserted — it drives the "assigned to me" filter, not access
// control. If that stops being good enough, give each grader their own passcode
// and check it here; nothing outside this file needs to change.
//
// The two are separate steps so the roster (committee names + emails, read from
// Airtable) is never rendered to someone who hasn't given the password.

const COOKIE = "mg_grader";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Grader = { name: string; email: string };
/** `grader: null` = password accepted, still need to say who you are. */
export type Session = { grader: Grader | null };

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string, secret: string) {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

/** Both sides hashed first, so the compare is constant-time and length-safe. */
function matches(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.GRADER_PASSWORD && process.env.GRADER_SESSION_SECRET,
  );
}

export function checkPassword(input: string): boolean {
  const expected = process.env.GRADER_PASSWORD;
  return Boolean(expected) && matches(input, expected!);
}

export async function startSession(grader: Grader | null): Promise<void> {
  const secret = process.env.GRADER_SESSION_SECRET;
  if (!secret) throw new Error("GRADER_SESSION_SECRET is not set");

  const payload = b64url(
    Buffer.from(
      JSON.stringify({ grader, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
    ),
  );
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload, secret)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/grade",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: COOKIE, path: "/grade" });
}

export async function readSession(): Promise<Session | null> {
  const secret = process.env.GRADER_SESSION_SECRET;
  if (!secret) return null;

  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  if (!matches(signature, sign(payload, secret))) return null;

  try {
    const { grader, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    if (typeof exp !== "number" || exp < Date.now()) return null;
    if (
      grader !== null &&
      (typeof grader?.email !== "string" || typeof grader?.name !== "string")
    ) {
      return null;
    }
    return { grader };
  } catch {
    return null;
  }
}
