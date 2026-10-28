"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import PinInput from "./PinInput";
import {
  authenticate,
  type AuthMode,
  type AuthState,
} from "@/app/(v2)/login/actions";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import { FIELD_LIGHT } from "@/v2/components/styles";

const initial: AuthState = { step: "email", email: "" };

const LINK =
  "text-sm font-semibold text-meeple underline-offset-2 hover:underline";
const FORM = "flex max-w-[420px] flex-col gap-4";

function Messages({ state }: { state: AuthState }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm">
      {state.error ? (
        <span className="text-meeple">{state.error}</span>
      ) : (
        <span className="text-ink/70">{state.notice}</span>
      )}
    </p>
  );
}

export default function AuthForm({
  mode,
  next,
  startByCode,
}: {
  mode: AuthMode;
  next: string;
  /** Open on the email-code form, for people who have no password yet. */
  startByCode?: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate, initial);
  const [byCode, setByCode] = useState(startByCode || mode === "signup");
  const verifyButton = useRef<HTMLButtonElement>(null);

  const hidden = (
    <>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
    </>
  );

  if (state.step === "code") {
    return (
      <form action={action} className={FORM}>
        {hidden}
        <input type="hidden" name="email" value={state.email} />
        <p className="text-base text-ink">
          We emailed a six-digit code to <strong>{state.email}</strong>. Enter
          it below; it works for 10 minutes. Not there? Check spam, or send a
          new one.
        </p>
        <PinInput
          name="code"
          disabled={pending}
          onComplete={() => verifyButton.current?.click()}
        />
        <Button
          ref={verifyButton}
          type="submit"
          name="intent"
          value="verify"
          disabled={pending}
          className="self-start"
        >
          {pending ? "Checking…" : "Continue"}
        </Button>
        <Messages state={state} />
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <button
            type="submit"
            name="intent"
            value="resend"
            disabled={pending}
            className={LINK}
          >
            Send a new code
          </button>
          <button
            type="submit"
            name="intent"
            value="restart"
            disabled={pending}
            className={LINK}
          >
            Use a different email
          </button>
          {mode === "signin" && (
            <button
              type="submit"
              name="intent"
              value="restart"
              disabled={pending}
              onClick={() => setByCode(false)}
              className={LINK}
            >
              Sign in with a password instead
            </button>
          )}
        </div>
      </form>
    );
  }

  if (state.step === "password") {
    return (
      <form action={action} className={FORM}>
        {hidden}
        {/* A real (hidden) username field, so password managers treat this as
            a new-password form for this account instead of guessing. */}
        <input
          type="email"
          name="email"
          value={state.email}
          autoComplete="username"
          readOnly
          hidden
        />
        {state.notice && <p className="text-sm text-ink/70">{state.notice}</p>}
        <p className="text-base text-ink">
          {state.replacing
            ? "You're signed in. Forgot your password? Set a new one here, or skip this if you remember it."
            : "You're signed in. Optional: choose a password so next time you can skip the email code."}
        </p>
        <Input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          placeholder={
            state.replacing
              ? "New password (8+ characters)"
              : "Password (8+ characters)"
          }
          required
          minLength={8}
          autoFocus
          className={FIELD_LIGHT}
        />
        <Input
          type="password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Repeat password"
          required
          minLength={8}
          className={FIELD_LIGHT}
        />
        <Button
          type="submit"
          name="intent"
          value="set-password"
          disabled={pending}
          className="self-start"
        >
          {pending
            ? "Saving…"
            : state.replacing
              ? "Set new password"
              : "Save password"}
        </Button>
        <Messages state={{ ...state, notice: undefined }} />
        <button
          type="submit"
          name="intent"
          value="skip"
          disabled={pending}
          className={`${LINK} self-start`}
        >
          Skip for now
        </button>
      </form>
    );
  }

  // The two ways in, as one toggle. Spelled out because a code is also how
  // you sign in with no password yet, and how you get past a forgotten one.
  const forgot = mode === "signin" && (
    <p className="self-start text-sm text-ink/55">
      {byCode ? "Have a password? " : "No password, or forgot it? "}
      <button
        type="button"
        onClick={() => setByCode((v) => !v)}
        className="font-semibold text-ink/70 underline-offset-2 hover:text-ink hover:underline"
      >
        {byCode ? "Sign in with it instead" : "Email me a code instead"}
      </button>
    </p>
  );

  return (
    <form action={action} className={FORM}>
      {hidden}
      {mode === "signin" && (
        <p className="text-base text-ink">
          {byCode
            ? "We'll email a six-digit code to this address and sign you in with it. No password needed, and if you had one, you can set a new one after."
            : "Sign in with your email and password."}
        </p>
      )}
      <Input
        type="email"
        name="email"
        defaultValue={state.email}
        autoComplete="email"
        placeholder="you@example.com"
        required
        autoFocus
        className={FIELD_LIGHT}
      />
      {byCode ? (
        forgot
      ) : (
        <div className="flex flex-col gap-1.5">
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            className={FIELD_LIGHT}
          />
          {forgot}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="intent"
          value={byCode ? "code" : "password"}
          disabled={pending}
        >
          {pending ? "One sec…" : byCode ? "Email me a code" : "Sign in"}
        </Button>
      </div>
      <Messages state={state} />
      {mode === "signin" && (
        <Link href="/signup" className={`${LINK} self-start`}>
          First time here? Create an account
        </Link>
      )}
      {mode === "signup" && (
        <Link href="/login" className={`${LINK} self-start`}>
          Already have an account? Sign in
        </Link>
      )}
    </form>
  );
}
