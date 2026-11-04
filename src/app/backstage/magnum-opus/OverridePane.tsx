"use client";

import { useState, useTransition } from "react";
import { changeOverride } from "./actions";
import { pacific } from "./pacific";
import type { Override, OverrideName } from "@/lib/site-settings";

/** One schedule-with-override switch: the tab, or loans. */
export default function OverridePane({
  name,
  title,
  status,
  options,
  override,
  updatedAt,
  updatedBy,
}: {
  name: OverrideName;
  title: string;
  /** What's true right now, e.g. "Loans are open right now." */
  status: React.ReactNode;
  /** Labels and hints for schedule (null), on (true) and off (false). */
  options: { value: Override; label: string; hint: string }[];
  override: Override;
  updatedAt: number | null;
  updatedBy: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const choose = (value: Override) => {
    setError(null);
    start(async () => {
      const result = await changeOverride(name, value);
      if (result.error) setError(result.error);
    });
  };

  return (
    <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
      <h2 className="font-bebas text-2xl tracking-wide text-navy">{title}</h2>
      <p className="mt-1 text-sm text-ink/70">{status}</p>

      <fieldset className="mt-5 flex flex-col gap-2" disabled={pending}>
        <legend className="sr-only">{title}</legend>
        {options.map((o) => (
          <label
            key={String(o.value)}
            className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-checked:border-navy has-checked:bg-cream"
          >
            <input
              type="radio"
              name={name}
              checked={override === o.value}
              onChange={() => choose(o.value)}
              className="mt-1 accent-navy"
            />
            <span>
              <span className="font-semibold text-navy">{o.label}</span>
              <span className="block text-sm text-ink/60">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {updatedAt !== null && (
        <p className="mt-4 text-xs text-ink/50">
          Last changed {pacific(updatedAt)}
          {updatedBy ? ` by ${updatedBy}` : ""}.
        </p>
      )}
    </section>
  );
}
