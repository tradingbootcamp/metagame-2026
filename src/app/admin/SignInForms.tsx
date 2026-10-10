"use client";

import { useActionState } from "react";
import { identify, unlock, type FormState } from "./auth-actions";
import { buttonClass, Card, fieldClass } from "./ui";

const initial: FormState = {};

/** Password half of the sign-in card; SignIn.tsx decides whether to show it. */
export function PasswordForm() {
  const [state, action, pending] = useActionState(unlock, initial);

  return (
    <form action={action} className="space-y-3">
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Password"
        required
        className={fieldClass}
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Checking…" : "Enter"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-meeple">
        {state.error}
      </p>
    </form>
  );
}

export function NameForm() {
  const [state, action, pending] = useActionState(identify, initial);

  return (
    <Card title="Who are you?">
      <form action={action} className="space-y-3">
        <input
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          required
          autoFocus
          maxLength={60}
          className={fieldClass}
        />
        <p className="text-sm text-ink/60">
          Labels what you create so you can find it again.
        </p>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "One sec…" : "Continue"}
        </button>
        <p aria-live="polite" className="min-h-5 text-sm text-meeple">
          {state.error}
        </p>
      </form>
    </Card>
  );
}
