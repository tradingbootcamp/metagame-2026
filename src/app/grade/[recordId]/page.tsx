import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GradeForm from "./GradeForm";
import { isConfigured, readSession } from "@/lib/grader-auth";
import {
  CONTEXT_FIELDS,
  getSubmission,
  hostPicture,
  type Submission,
} from "@/lib/rfp-rubric";

function renderValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || null;
  if (typeof value === "object") return null;
  return String(value);
}

function Context({ submission }: { submission: Submission }) {
  const rows = CONTEXT_FIELDS.flatMap((f) => {
    const value = renderValue(submission.fields[f.field]);
    return value === null ? [] : [{ label: f.label as string, value }];
  });

  return (
    <dl className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs font-semibold tracking-wide text-ink/45 uppercase">
            {row.label}
          </dt>
          <dd className="mt-0.5 text-[15px] whitespace-pre-wrap text-ink/85">
            {row.value}
          </dd>
        </div>
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

  const picture = hostPicture(submission);
  const assigned = submission.graders.some(
    (g) => g.email === session.grader!.email,
  );

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

      {!assigned && (
        <p className="rounded-lg bg-tan/20 px-4 py-3 text-sm text-navy">
          This one is assigned to{" "}
          {submission.graders.map((g) => g.name).join(", ") || "nobody"} — you
          can still grade it, but check with them first.
        </p>
      )}

      <section className="rounded-xl border border-line bg-white p-5">
        <Context submission={submission} />
      </section>

      <GradeForm recordId={submission.id} initial={submission.fields} />
    </div>
  );
}
