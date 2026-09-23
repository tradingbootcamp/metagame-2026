"use client";

import { useActionState } from "react";
import { submitGrades, type SaveState } from "../actions";
import {
  GRADING_STATUS_FIELD,
  GRADING_STATUSES,
  META_FIELDS,
  RUBRIC_GRADES,
  RUBRIC_METRICS,
  type RubricGrade,
} from "@/lib/rfp-rubric";

const initialState: SaveState = {};

const GRADE_TONE: Record<RubricGrade, string> = {
  Best: "peer-checked:border-moss peer-checked:bg-moss/12",
  Good: "peer-checked:border-moss/70 peer-checked:bg-moss/8",
  Meh: "peer-checked:border-tan peer-checked:bg-tan/15",
  Bad: "peer-checked:border-salmon peer-checked:bg-salmon/12",
  Unclear: "peer-checked:border-ink/40 peer-checked:bg-ink/6",
};

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-navy";

function asString(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-line bg-white p-5">
      <h2 className="font-bebas text-xl tracking-wide text-navy">{title}</h2>
      {children}
    </section>
  );
}

export default function GradeForm({
  recordId,
  initial,
}: {
  recordId: string;
  initial: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState(
    submitGrades.bind(null, recordId),
    initialState,
  );

  return (
    <form action={action} className="space-y-6">
      <Section title="Rubric">
        <div className="space-y-6">
          {RUBRIC_METRICS.map((metric) => {
            const current = asString(initial[metric.field]);
            return (
              <fieldset key={metric.field}>
                <legend className="mb-2 font-medium text-navy">
                  {metric.label}
                </legend>
                <div className="grid gap-1.5">
                  {RUBRIC_GRADES.map((grade) => {
                    const guidance =
                      grade in metric.guidance
                        ? metric.guidance[grade as keyof typeof metric.guidance]
                        : "No strong read either way.";
                    return (
                      <label
                        key={grade}
                        className="flex cursor-pointer items-start gap-3"
                      >
                        <input
                          type="radio"
                          name={metric.field}
                          value={grade}
                          defaultChecked={current === grade}
                          className="peer sr-only"
                        />
                        <span
                          className={`flex-1 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-cream ${GRADE_TONE[grade]}`}
                        >
                          <span className="font-semibold text-navy">
                            {grade}
                          </span>
                          <span className="ml-2 text-ink/65">{guidance}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      </Section>

      <Section title="Details">
        <div className="space-y-5">
          {META_FIELDS.map((field) => (
            <div key={field.field}>
              <label
                htmlFor={field.field}
                className="block font-medium text-navy"
              >
                {field.label}
              </label>
              {"help" in field && field.help && (
                <p className="mb-1.5 text-sm text-ink/55">{field.help}</p>
              )}

              {field.kind === "text" && (
                <textarea
                  id={field.field}
                  name={field.field}
                  rows={3}
                  defaultValue={asString(initial[field.field])}
                  className={`${inputClass} mt-1`}
                />
              )}

              {field.kind === "number" && (
                <input
                  id={field.field}
                  name={field.field}
                  type="number"
                  min={0}
                  defaultValue={asString(initial[field.field])}
                  className={`${inputClass} mt-1 max-w-40`}
                />
              )}

              {field.kind === "select" && (
                <select
                  id={field.field}
                  name={field.field}
                  defaultValue={asString(initial[field.field])}
                  className={`${inputClass} mt-1`}
                >
                  <option value="">—</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {field.kind === "multiSelect" && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {/* Keeps the field in the payload when nothing is ticked, so
                      unticking everything clears the cell. */}
                  <input type="hidden" name={`${field.field}[]`} value="" />
                  {field.options.map((option) => (
                    <label key={option} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name={`${field.field}[]`}
                        value={option}
                        defaultChecked={asArray(initial[field.field]).includes(
                          option,
                        )}
                        className="peer sr-only"
                      />
                      <span className="inline-block rounded-full border border-line px-3 py-1.5 text-sm transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-cream hover:bg-cream">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur">
        <label htmlFor={GRADING_STATUS_FIELD} className="text-sm text-ink/70">
          Status
        </label>
        <select
          id={GRADING_STATUS_FIELD}
          name={GRADING_STATUS_FIELD}
          defaultValue={
            asString(initial[GRADING_STATUS_FIELD]) || "In Progress"
          }
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy"
        >
          {GRADING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-meeple px-5 py-2.5 font-roboto font-semibold text-white transition-colors hover:bg-meeple-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.error ? (
            <span className="text-meeple">{state.error}</span>
          ) : state.savedAt ? (
            <span className="text-moss">Saved to Airtable.</span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
