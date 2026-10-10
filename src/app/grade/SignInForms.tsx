"use client";

import { useActionState } from "react";
import { identify, unlock, type FormState } from "./actions";
import { SOMEONE_ELSE } from "@/lib/grader-identity";

const initial: FormState = {};

const fieldClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-navy";
const buttonClass =
  "w-full rounded-lg bg-meeple px-4 py-2.5 font-roboto font-semibold text-white transition-colors hover:bg-meeple-dark disabled:opacity-60";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
      <h1 className="font-bebas mb-4 text-2xl tracking-wide text-navy">
        {title}
      </h1>
      {children}
    </div>
  );
}

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

export function GraderPicker({ graders }: { graders: string[] }) {
  const [state, action, pending] = useActionState(identify, initial);

  return (
    <Card title="Who are you?">
      <form action={action} className="space-y-3">
        <select name="grader" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Pick your name
          </option>
          {graders.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={SOMEONE_ELSE}>{SOMEONE_ELSE}</option>
        </select>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "One sec…" : "Start grading"}
        </button>
        <p aria-live="polite" className="min-h-5 text-sm text-meeple">
          {state.error}
        </p>
      </form>
      {graders.length === 0 && (
        <p className="text-sm text-ink/60">
          The Airtable “Rubric: Grader” and “Shepherd” columns have no names to
          choose from yet. Add them as options on either column and they’ll show
          up here.
        </p>
      )}
    </Card>
  );
}
