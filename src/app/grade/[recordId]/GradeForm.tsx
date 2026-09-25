"use client";

import { useActionState, useState } from "react";
import InfoTip from "../InfoTip";
import { submitGrades, type SaveState } from "../actions";
import {
  NEXT_STEPS_FIELD,
  NEXT_STEPS_GRADE,
  RUBRIC_GRADES,
  RUBRIC_METRICS,
  type ResolvedField,
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

function Field({
  field,
  initial,
}: {
  field: ResolvedField;
  initial: Record<string, unknown>;
}) {
  return (
    <div>
      <div className="font-medium text-navy">
        <label htmlFor={field.field}>{field.label}</label>
        {field.description && <InfoTip text={field.description} />}
      </div>

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
                defaultChecked={asArray(initial[field.field]).includes(option)}
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
  );
}

export default function GradeForm({
  recordId,
  initial,
  metaFields,
  nextSteps,
  advanceTo,
}: {
  recordId: string;
  initial: Record<string, unknown>;
  metaFields: ResolvedField[];
  /** The proposal's current pipeline step. */
  nextSteps: string | null;
  /** Where a finished grader moves it, or null if Airtable dropped the step. */
  advanceTo: string | null;
}) {
  const [state, action, pending] = useActionState(
    submitGrades.bind(null, recordId),
    initialState,
  );

  // The prompt tracks the rubric until the grader overrides it by hand: saving
  // with all five scored is a finished grade, saving partway through isn't.
  const [complete, setComplete] = useState(() =>
    RUBRIC_METRICS.every((m) => Boolean(initial[m.field])),
  );
  const [override, setOverride] = useState<boolean | null>(null);

  // Only offered while it's still sitting in grading — past that, moving it
  // back to the committee's queue would walk the pipeline backwards.
  const advanceOption =
    advanceTo !== null && (nextSteps === null || nextSteps === NEXT_STEPS_GRADE)
      ? advanceTo
      : null;

  return (
    // React resets an uncontrolled form once its action resolves, which snapped
    // every field back to the defaults captured before the save. Re-keying on
    // the save remounts the form against `initial` as Airtable now has it.
    <form
      key={state.savedAt ?? "initial"}
      action={action}
      onChange={(event) => {
        const data = new FormData(event.currentTarget);
        setComplete(RUBRIC_METRICS.every((m) => data.get(m.field)));
      }}
      className="space-y-6"
    >
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
          {metaFields.map((field) => (
            <Field key={field.field} field={field} initial={initial} />
          ))}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur">
        {advanceOption && (
          // Unchecked boxes are left out of the form data entirely, so not
          // ticking this leaves Next steps alone rather than clearing it.
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              name={NEXT_STEPS_FIELD}
              value={advanceOption}
              checked={override ?? complete}
              onChange={(event) => setOverride(event.target.checked)}
              className="size-4 accent-meeple"
            />
            Done grading — move to “{advanceOption}”
          </label>
        )}
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
