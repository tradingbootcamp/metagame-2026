"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { currentSession, getAuth, hasPassword } from "@/lib/auth";
import { claimTicket, normalizeTicketCode } from "@/lib/ticket-store";

export type FormState = { error?: string; saved?: boolean };

async function requireSession() {
  const session = await currentSession();
  if (!session) redirect("/login?next=/account");
  return session;
}

const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "")
    .trim()
    .slice(0, max) || null;

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  if (!name) return { error: "Enter your name." };

  const values = {
    preferredName: text(formData, "preferredName", 80),
    pronouns: text(formData, "pronouns", 40),
    discordHandle: text(formData, "discordHandle", 40),
    bio: text(formData, "bio", 1000),
    isPublic: formData.get("isPublic") === "on",
  };

  if (name !== session.user.name) {
    await getAuth().api.updateUser({
      body: { name },
      headers: await headers(),
    });
  }
  const { profiles } = schema;
  await getDb()
    .insert(profiles)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });

  revalidatePath("/account");
  return { saved: true };
}

export type PasswordState = {
  /** "code" swaps the current-password field for an emailed code. */
  mode: "password" | "code";
  error?: string;
  notice?: string;
  saved?: boolean;
};

// Change with the current password, or, having forgotten it, prove the email
// with a code instead. The code reset revokes every session, so this one is
// signed back in afterwards.
export async function savePassword(
  prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await requireSession();
  const email = session.user.email;
  const intent = String(formData.get("intent") ?? "change");
  const auth = getAuth();

  if (intent === "cancel") return { mode: "password" };

  if (intent === "send" || intent === "resend") {
    try {
      await auth.api.requestPasswordResetEmailOTP({ body: { email } });
    } catch (e) {
      console.error("[account] sending reset code failed", e);
      return { ...prev, error: "We couldn't send the email. Try again." };
    }
    return {
      mode: "code",
      notice: intent === "resend" ? "Sent a new code." : undefined,
    };
  }

  const fail = (error: string): PasswordState => ({ mode: prev.mode, error });
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) return fail("Use at least 8 characters.");
  if (newPassword !== String(formData.get("confirm") ?? "")) {
    return fail("The passwords don't match.");
  }
  const requestHeaders = await headers();

  if (intent === "reset") {
    const otp = String(formData.get("code") ?? "").replace(/\D/g, "");
    if (otp.length !== 6) return fail("Enter the 6-digit code.");
    try {
      await auth.api.resetPasswordEmailOTP({
        body: { email, otp, password: newPassword },
      });
    } catch (e) {
      const code = e instanceof APIError ? e.body?.code : undefined;
      return fail(
        code === "OTP_EXPIRED"
          ? "That code expired. Send a new one."
          : code === "TOO_MANY_ATTEMPTS"
            ? "Too many tries. Send a new code."
            : "That code didn't match.",
      );
    }
    await auth.api.signInEmail({
      body: { email, password: newPassword },
      headers: requestHeaders,
    });
    revalidatePath("/account");
    return { mode: "password", saved: true };
  }

  try {
    if (await hasPassword(session.user.id)) {
      await auth.api.changePassword({
        body: {
          currentPassword: String(formData.get("currentPassword") ?? ""),
          newPassword,
          revokeOtherSessions: true,
        },
        headers: requestHeaders,
      });
    } else {
      await auth.api.setPassword({
        body: { newPassword },
        headers: requestHeaders,
      });
    }
  } catch (e) {
    if (e instanceof APIError && e.body?.code === "INVALID_PASSWORD") {
      return fail("Your current password is wrong.");
    }
    throw e;
  }

  revalidatePath("/account");
  return { mode: "password", saved: true };
}

export type ClaimState = { error?: string; claimed?: string };

const CLAIM_ERRORS = {
  unknown: "We don't have a ticket with that code. Check it against the email.",
  yours: "That ticket is already yours.",
  taken: "Someone else has already claimed that ticket.",
  unpaid: "That ticket's payment hasn't settled yet. Try again later.",
};

export async function claim(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const session = await requireSession();
  const code = normalizeTicketCode(String(formData.get("code") ?? ""));
  if (code.length !== 6) return { error: "Codes are 6 characters." };
  const result = await claimTicket(session.user.id, code);
  if (!result.ok) return { error: CLAIM_ERRORS[result.reason] };
  revalidatePath("/account");
  return { claimed: result.ticket.tier ?? "Your ticket" };
}

export async function signOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}
