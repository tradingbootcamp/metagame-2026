"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentSession, getAuth, hasPassword } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";

export type AuthMode = "signin" | "signup";

export type AuthState = {
  step: "email" | "code" | "password";
  email: string;
  error?: string;
  notice?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const apiCode = (e: unknown) =>
  e instanceof APIError ? e.body?.code : undefined;

async function sendCode(email: string): Promise<string | undefined> {
  try {
    await getAuth().api.sendVerificationOTP({
      body: { email, type: "sign-in" },
    });
  } catch (e) {
    console.error("[auth] sending code failed", e);
    return "We couldn't send the email. Try again in a minute.";
  }
}

// One action for both /login and /signup; `intent` says which button was
// pressed and `mode` which page it came from.
export async function authenticate(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const intent = String(formData.get("intent") ?? "");
  const mode: AuthMode =
    formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? prev.email)
    .trim()
    .toLowerCase();
  const next = safeNextPath(formData.get("next"));

  if (intent === "skip") redirect(next);
  if (intent === "restart") return { step: "email", email };

  if (intent === "set-password") {
    if (!(await currentSession())) {
      return { step: "email", email, error: "Your session expired." };
    }
    const newPassword = String(formData.get("newPassword") ?? "");
    if (newPassword.length < 8) {
      return { step: "password", email, error: "Use at least 8 characters." };
    }
    if (newPassword !== String(formData.get("confirm") ?? "")) {
      return { step: "password", email, error: "The passwords don't match." };
    }
    try {
      await getAuth().api.setPassword({
        body: { newPassword },
        headers: await headers(),
      });
    } catch (e) {
      if (apiCode(e) !== "PASSWORD_ALREADY_SET") throw e;
    }
    redirect(next);
  }

  if (!EMAIL_RE.test(email)) {
    return { step: "email", email, error: "Enter a valid email address." };
  }

  if (intent === "code" || intent === "resend") {
    const error = await sendCode(email);
    if (error) return { step: "email", email, error };
    return {
      step: "code",
      email,
      notice: intent === "resend" ? "Sent a new code." : undefined,
    };
  }

  if (intent === "password") {
    const password = String(formData.get("password") ?? "");
    if (!password)
      return { step: "email", email, error: "Enter your password." };
    try {
      await getAuth().api.signInEmail({
        body: { email, password },
        headers: await headers(),
      });
    } catch (e) {
      if (apiCode(e) === "EMAIL_NOT_VERIFIED") {
        // Nobody has proved they own this address yet, so its password can't
        // be trusted. Signing in by code also clears that password.
        const error = await sendCode(email);
        if (error) return { step: "email", email, error };
        return {
          step: "code",
          email,
          notice:
            "This address hasn't been verified yet, so we emailed you a code instead.",
        };
      }
      return {
        step: "email",
        email,
        error:
          "Wrong email or password. No password yet? Sign in with a code instead.",
      };
    }
    redirect(next);
  }

  if (intent === "verify") {
    const otp = String(formData.get("code") ?? "").replace(/\D/g, "");
    if (otp.length !== 6) {
      return { step: "code", email, error: "Enter the 6-digit code." };
    }
    let userId: string;
    try {
      const result = await getAuth().api.signInEmailOTP({
        body: { email, otp },
        headers: await headers(),
      });
      userId = result.user.id;
    } catch (e) {
      const code = apiCode(e);
      const error =
        code === "OTP_EXPIRED"
          ? "That code expired. Send a new one."
          : code === "TOO_MANY_ATTEMPTS"
            ? "Too many tries. Send a new code."
            : "That code didn't match.";
      return { step: "code", email, error };
    }
    // Signing up: offer a password right away, unless this turned out to be an
    // existing account that already has one.
    if (mode === "signup" && !(await hasPassword(userId))) {
      return { step: "password", email };
    }
    redirect(next);
  }

  return prev;
}
