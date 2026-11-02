"use client";

import { smallButtonClass } from "../ui";
import type { Verdict, VerdictRow } from "@/lib/budget-verdicts";

// META-4571: every model's answer for this line, side by side. Picking one
// fills the card's fields; the card reports the pick on approve.

export default function VerdictOptions({
  verdicts,
  pickedModel,
  onPick,
}: {
  verdicts: VerdictRow[];
  pickedModel: string | null;
  onPick: (model: string, verdict: Verdict) => void;
}) {
  if (verdicts.length === 0) return null;
  return (
    <section className="mt-3 rounded-lg border border-line bg-cream/40 p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink/60 uppercase">
        Model verdicts
      </p>
      <ul className="space-y-2">
        {verdicts.map((v) => {
          const active = v.model === pickedModel;
          return (
            <li
              key={v.model}
              className={`rounded-md border px-3 py-2 text-sm ${
                active ? "border-navy bg-white" : "border-line/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink/70">
                  {v.model}
                  {v.latencyMs !== null && (
                    <span className="text-ink/40">
                      {" "}
                      · {(v.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {v.inputTokens !== null && (
                    <span className="text-ink/40">
                      {" "}
                      · ~{v.inputTokens}+{v.outputTokens ?? 0} tok
                    </span>
                  )}
                </span>
                {v.verdict && (
                  <button
                    type="button"
                    className={smallButtonClass}
                    onClick={() => onPick(v.model, v.verdict as Verdict)}
                  >
                    {active ? "Using" : "Use"}
                  </button>
                )}
              </div>
              {v.verdict ? (
                <p className="mt-1">
                  <span className="font-medium">{v.verdict.category}</span>
                  {v.verdict.parent ? ` → ${v.verdict.parent}` : ""}
                  {v.verdict.phase ? ` · ${v.verdict.phase}` : ""}
                  {` · ${v.verdict.confidence}`}
                  <span className="block text-xs text-ink/60 italic">
                    {v.verdict.item}
                    {v.verdict.reason ? ` — ${v.verdict.reason}` : ""}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-meeple">
                  {v.error ?? "no answer for this line"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
