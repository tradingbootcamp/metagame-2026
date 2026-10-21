"use client";

import { useState, useTransition } from "react";
import { setPipelineField } from "./actions";
import { swatch } from "@/lib/airtable-colors";
import type { PipelineField } from "@/lib/rfp-pipeline";

/**
 * A select painted as its pipeline pill. Browsers won't style the options in
 * the open menu — that's a native menu — but the closed control carries the
 * colour of the current value, which is the part that has to be scannable.
 *
 * Saves on change, optimistically: the pill recolours immediately and reverts
 * if the save is refused.
 */
export default function InlineSelect({
  sessionId,
  field,
  value,
  options,
  colors,
}: {
  sessionId: string;
  field: PipelineField;
  /** The option label shown, or null. */
  value: string | null;
  options: readonly string[];
  colors: Record<string, string>;
}) {
  const [current, setCurrent] = useState(value ?? "");
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const tone = swatch(colors[current]);

  // Covers a value the option list doesn't offer, e.g. a grader without an
  // account yet.
  const shown = [
    ...options,
    ...(current && !options.includes(current) ? [current] : []),
  ];

  function change(next: string) {
    const previous = current;
    setCurrent(next);
    setFailed(null);
    startSaving(async () => {
      const result = await setPipelineField(sessionId, field, next);
      if (result?.error) {
        setCurrent(previous);
        setFailed(result.error);
      }
    });
  }

  return (
    <span className="relative block min-w-0">
      <select
        aria-label={field}
        title={failed ?? (current || "Not set")}
        value={current}
        disabled={saving}
        onChange={(event) => change(event.target.value)}
        style={tone ?? undefined}
        className={`w-full cursor-pointer appearance-none truncate rounded-full py-1 pr-5 pl-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
          saving ? "opacity-60" : ""
        } ${failed ? "ring-2 ring-meeple" : ""} ${
          tone ? "" : "bg-ink/6 text-ink/55"
        }`}
      >
        <option value="">—</option>
        {shown.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        style={tone ? { color: tone.color } : undefined}
        className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] opacity-70"
      >
        ▼
      </span>
    </span>
  );
}
