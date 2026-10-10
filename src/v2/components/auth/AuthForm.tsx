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
}: {
  mode: AuthMode;
  next: string;
}) {
  const [state, action, pending] = useActionState(authenticate, initial);
  const [byCode, setByCode] = useState(mode === "signup");
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
          We emailed a code to <strong>{state.email}</strong>. It works for 10
          minutes.
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
        <div className="flex gap-5">
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
        </div>
      </form>
    );
  }

  if (state.step === "password") {
    return (
      <form action={action} className={FORM}>
        {hidden}
        <input type="hidden" name="email" value={state.email} />
        <p className="text-base text-ink">
          You&apos;re in. Choose a password and next time you can sign in with
          it instead of a code.
        </p>
        <Input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          placeholder="Password (8+ characters)"
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
          {pending ? "Saving…" : "Save password"}
        </Button>
        <Messages state={state} />
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

  return (
    <form action={action} className={FORM}>
      {hidden}
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
      {!byCode && (
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          className={FIELD_LIGHT}
        />
      )}
      <Button
        type="submit"
        name="intent"
        value={byCode ? "code" : "password"}
        disabled={pending}
        className="self-start"
      >
        {pending ? "One sec…" : byCode ? "Email me a code" : "Sign in"}
      </Button>
      <Messages state={state} />
      <div className="flex flex-col items-start gap-2">
        {mode === "signin" && (
          <button
            type="button"
            onClick={() => setByCode((v) => !v)}
            className={LINK}
          >
            {byCode
              ? "Back to password sign-in"
              : "Forgot your password? Sign in with a code"}
          </button>
        )}
        {mode === "signin" ? (
          <Link href="/signup" className={LINK}>
            New here? Create an account
          </Link>
        ) : (
          <Link href="/login" className={LINK}>
            Already have an account? Sign in
          </Link>
        )}
      </div>
    </form>
  );
}
