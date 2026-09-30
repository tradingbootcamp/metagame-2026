import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Shared-password sign-in with a signed session cookie. One password gets you
// in; what the session then says about who you are is self-asserted and only
// drives filters, never access control. Each tool gets its own instance so
// their cookies and passwords stay independent.

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Session<I> = { identity: I | null };

type Config<I> = {
  cookie: string;
  path: string;
  passwordEnv: string;
  secretEnv: string;
  /** Rebuilds the identity from the cookie payload, so a tampered payload can't invent a shape. */
  parseIdentity: (value: unknown) => I | null;
};

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

export function createSessionAuth<I>(config: Config<I>) {
  const { cookie, path, passwordEnv, secretEnv, parseIdentity } = config;

  return {
    isConfigured(): boolean {
      return Boolean(process.env[passwordEnv] && process.env[secretEnv]);
    },

    checkPassword(input: string): boolean {
      const expected = process.env[passwordEnv];
      return Boolean(expected) && matches(input, expected!);
    },

    async startSession(identity: I | null): Promise<void> {
      const secret = process.env[secretEnv];
      if (!secret) throw new Error(`${secretEnv} is not set`);

      const payload = b64url(
        Buffer.from(
          JSON.stringify({
            identity,
            exp: Date.now() + MAX_AGE_SECONDS * 1000,
          }),
        ),
      );
      const store = await cookies();
      store.set(cookie, `${payload}.${sign(payload, secret)}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path,
        maxAge: MAX_AGE_SECONDS,
      });
    },

    async endSession(): Promise<void> {
      const store = await cookies();
      store.delete({ name: cookie, path });
    },

    async readSession(): Promise<Session<I> | null> {
      const secret = process.env[secretEnv];
      if (!secret) return null;

      const raw = (await cookies()).get(cookie)?.value;
      if (!raw) return null;

      const [payload, signature] = raw.split(".");
      if (!payload || !signature) return null;
      if (!matches(signature, sign(payload, secret))) return null;

      try {
        const { identity, grader, exp } = JSON.parse(
          Buffer.from(payload, "base64url").toString(),
        );
        if (typeof exp !== "number" || exp < Date.now()) return null;
        // `grader` is the pre-"Someone else" /grade cookie shape, `{ name }`;
        // reading it too keeps sessions issued before that change signed in.
        return { identity: parseIdentity(identity ?? grader) };
      } catch {
        return null;
      }
    },
  };
}
