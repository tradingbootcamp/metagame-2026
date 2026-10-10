import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, emailOTP } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, schema } from "@/db";
import { env } from "@/env";
import { sendSignInCodeEmail } from "@/lib/email";

function createAuth() {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set — see .env.example");
  }
  const db = getDb();

  return betterAuth({
    appName: "Metagame",
    secret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    // No baseURL: it's taken from each request, so previews and prod work on
    // whatever host they're served from.
    advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      // Accounts only come from proving the email with a code; a password is
      // added afterwards on /account and refused until the email is verified.
      disableSignUp: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
    },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db
              .insert(schema.profiles)
              .values({ userId: user.id })
              .onConflictDoNothing();
          },
        },
      },
    },
    plugins: [
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendSignInCodeEmail({ to: email, code: otp, type });
        },
        expiresIn: 10 * 60,
        allowedAttempts: 5,
      }),
      admin(),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let cached: Auth | null = null;

/** Built lazily, like getDb(), so modules can import this without the env set. */
export function getAuth(): Auth {
  return (cached ??= createAuth());
}

export type Session = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

/** The signed-in user for the current request, or null. */
export async function currentSession(): Promise<Session | null> {
  // headers() first: it marks the render dynamic, so `next build` never tries
  // to prerender a page through getAuth() (which needs the env).
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

/** Whether the user has a password to sign in with (a "credential" account row). */
export async function hasPassword(userId: string): Promise<boolean> {
  const { account } = schema;
  const rows = await getDb()
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Replaces the password without checking the current one. Only for callers
 * that just proved the email with a code; that proof is the reset token.
 */
export async function replacePassword(userId: string, newPassword: string) {
  const ctx = await getAuth().$context;
  const hash = await ctx.password.hash(newPassword);
  await ctx.internalAdapter.updatePassword(userId, hash);
}
