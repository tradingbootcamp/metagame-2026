"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { currentSession, getAuth, hasPassword } from "@/lib/auth";

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

export async function savePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) return { error: "Use at least 8 characters." };
  if (newPassword !== String(formData.get("confirm") ?? "")) {
    return { error: "The passwords don't match." };
  }

  const auth = getAuth();
  const requestHeaders = await headers();
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
      return { error: "Your current password is wrong." };
    }
    throw e;
  }

  revalidatePath("/account");
  return { saved: true };
}

export async function signOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}

export type ResetState = {
  step: "idle" | "code" | "done";
  error?: string;
  notice?: string;
};

// Forgot the current password while signed in: prove the email with a code
// instead. The reset revokes every session, so sign this one back in after.
export async function resetPassword(
  prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const session = await requireSession();
  const email = session.user.email;
  const intent = String(formData.get("intent") ?? "");
  const auth = getAuth();

  if (intent === "send" || intent === "resend") {
    try {
      await auth.api.requestPasswordResetEmailOTP({ body: { email } });
    } catch (e) {
      console.error("[account] sending reset code failed", e);
      return { step: "idle", error: "We couldn't send the email. Try again." };
    }
    return {
      step: "code",
      notice: intent === "resend" ? "Sent a new code." : undefined,
    };
  }

  if (intent === "reset") {
    const otp = String(formData.get("code") ?? "").replace(/\D/g, "");
    if (otp.length !== 6)
      return { step: "code", error: "Enter the 6-digit code." };
    const password = String(formData.get("newPassword") ?? "");
    if (password.length < 8) {
      return { step: "code", error: "Use at least 8 characters." };
    }
    if (password !== String(formData.get("confirm") ?? "")) {
      return { step: "code", error: "The passwords don't match." };
    }
    try {
      await auth.api.resetPasswordEmailOTP({ body: { email, otp, password } });
    } catch (e) {
      const code = e instanceof APIError ? e.body?.code : undefined;
      return {
        step: "code",
        error:
          code === "OTP_EXPIRED"
            ? "That code expired. Send a new one."
            : code === "TOO_MANY_ATTEMPTS"
              ? "Too many tries. Send a new code."
              : "That code didn't match.",
      };
    }
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    revalidatePath("/account");
    return { step: "done", notice: "Password updated." };
  }

  return prev;
}
