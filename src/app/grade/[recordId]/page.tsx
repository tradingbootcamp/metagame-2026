import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GradeForm from "./GradeForm";
import InfoTip from "../InfoTip";
import { isConfigured, readSession } from "@/lib/grader-auth";
import {
  CONTEXT_FIELDS,
  getSubmission,
  hostPicture,
  DECISION_FIELDS,
  INTERNAL_FIELDS,
  META_FIELDS,
  resolveDisplayFields,
  resolveGradingStatuses,
  resolveEditableFields,
  type Submission,
} from "@/lib/rfp-rubric";

function renderValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || null;
  if (typeof value === "object") return null;
  return String(value);
}

function Row({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink/45 uppercase">
        {label}
        {description && <InfoTip text={description} />}
      </dt>
      <dd className="mt-0.5 text-[15px] whitespace-pre-wrap text-ink/85">
        {value}
      </dd>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      {title && (
        <h2 className="font-bebas mb-4 text-xl tracking-wide text-navy">
          {title}
        </h2>
      )}
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function rowsFor(
  submission: Submission,
  fields: { field: string; label: string; description?: string }[],
) {
  return fields.flatMap((f) => {
    const value = renderValue(submission.fields[f.field]);
    return value === null
      ? []
      : [{ label: f.label, value, description: f.description }];
  });
}

export default async function SubmissionPage(
  props: PageProps<"/grade/[recordId]">,
) {
  if (!isConfigured()) redirect("/grade");
  const session = await readSession();
  if (!session?.grader) redirect("/grade");

  const { recordId } = await props.params;
  const submission = await getSubmission(recordId);
  if (!submission) notFound();

  const picture = hostPicture(submission);
  const [internalFields, contextFields, metaFields, decisionFields, statuses] =
    await Promise.all([
      resolveDisplayFields(INTERNAL_FIELDS),
      resolveDisplayFields(CONTEXT_FIELDS),
      resolveEditableFields(META_FIELDS),
      resolveEditableFields(DECISION_FIELDS),
      resolveGradingStatuses(),
    ]);

  return (
    <div className="space-y-8">
      <Link href="/grade" className="text-sm text-ink/55 hover:text-meeple">
        ← All proposals
      </Link>

      <header className="flex items-start gap-4">
        {picture && (
          // Airtable attachment URLs are short-lived and off-domain, so this
          // stays a plain img rather than going through next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={picture.url}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="font-bebas text-3xl tracking-wide text-navy">
            {submission.title}
          </h1>
          <p className="text-ink/60">{submission.host}</p>
        </div>
      </header>

      <Panel>
        <Row
          label="Grader"
          value={
            submission.graders.map((g) => g.name).join(", ") || "Unassigned"
          }
          description="The committee member assigned to grade this proposal, from the Rubric: Grader column in Airtable."
        />
        {rowsFor(submission, internalFields).map((row) => (
          <Row key={row.label} {...row} />
        ))}
      </Panel>

      <Panel title="Request for Proposals submission">
        {rowsFor(submission, contextFields).map((row) => (
          <Row key={row.label} {...row} />
        ))}
      </Panel>

      <GradeForm
        recordId={submission.id}
        initial={submission.fields}
        metaFields={metaFields}
        decisionFields={decisionFields}
        statuses={statuses}
      />
    </div>
  );
}
