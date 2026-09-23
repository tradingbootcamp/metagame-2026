import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GradeForm from "./GradeForm";
import InfoTip from "../InfoTip";
import { isConfigured, readSession } from "@/lib/grader-auth";
import {
  getSubmission,
  hostPicture,
  resolveContextFields,
  resolveGradingStatuses,
  resolveMetaFields,
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

async function Context({ submission }: { submission: Submission }) {
  const fields = await resolveContextFields();
  const rows = fields.flatMap((f) => {
    const value = renderValue(submission.fields[f.field]);
    return value === null
      ? []
      : [{ label: f.label, value, description: f.description }];
  });

  return (
    <dl className="space-y-3">
      <Row
        label="Grader"
        value={submission.graders.map((g) => g.name).join(", ") || "Unassigned"}
        description="The committee member assigned to grade this proposal, from the Rubric: Grader column in Airtable."
      />
      {rows.map((row) => (
        <Row key={row.label} {...row} />
      ))}
    </dl>
  );
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

  const [picture, metaFields, statuses] = [
    hostPicture(submission),
    await resolveMetaFields(),
    await resolveGradingStatuses(),
  ];

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

      <section className="rounded-xl border border-line bg-white p-5">
        <Context submission={submission} />
      </section>

      <GradeForm
        recordId={submission.id}
        initial={submission.fields}
        metaFields={metaFields}
        statuses={statuses}
      />
    </div>
  );
}
