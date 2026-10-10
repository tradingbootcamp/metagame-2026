"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import { FIELD_LIGHT } from "@/v2/components/styles";
import { cn } from "@/v2/lib/utils";

const initial: LoginState = { step: "email", email: "" };

const LINK =
  "text-sm font-semibold text-meeple underline-offset-2 hover:underline";

function Messages({ state }: { state: LoginState }) {
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

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, initial);
  const [usePassword, setUsePassword] = useState(false);

  if (state.step === "code") {
    return (
      <form action={action} className="flex max-w-[420px] flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={state.email} />
        <p className="text-base text-ink">
          We emailed a code to <strong>{state.email}</strong>. It works for 10
          minutes.
        </p>
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="123456"
          required
          autoFocus
          className={cn(FIELD_LIGHT, "font-space-mono tracking-[0.3em]")}
        />
        <Button type="submit" name="intent" value="verify" disabled={pending}>
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

  return (
    <form action={action} className="flex max-w-[420px] flex-col gap-4">
      <input type="hidden" name="next" value={next} />
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
      {usePassword && (
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
        value={usePassword ? "password" : "code"}
        disabled={pending}
      >
        {pending ? "One sec…" : usePassword ? "Sign in" : "Email me a code"}
      </Button>
      <Messages state={state} />
      <button
        type="button"
        onClick={() => setUsePassword((v) => !v)}
        className={`${LINK} self-start`}
      >
        {usePassword ? "Email me a code instead" : "Use a password instead"}
      </button>
    </form>
  );
}
