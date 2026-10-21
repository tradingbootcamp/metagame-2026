import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GradeForm from "./GradeForm";
import InfoTip from "../InfoTip";
import { swatch } from "@/lib/airtable-colors";
import { SPACE_OPTIONS_FIELD } from "@/lib/grade-input";
import { gradeAccess, graderUserId } from "@/lib/grader-auth";
import {
  MEGAGAME_INTEREST_LABELS,
  RUBRIC_GRADE_LABELS,
} from "@/lib/rfp-labels";
import { committeeLabel, PIPELINE_COLORS, toRow } from "@/lib/rfp-pipeline";
import {
  CONTEXT_FIELDS,
  MARKETING_CONSENT_FIELD,
  META_FIELDS,
  RUBRIC_METRICS,
  SHEPHERD_CONTACT_FIELDS,
  SHEPHERD_NOTES_FIELDS,
  type FormField,
  type RfpContext,
  type ShepherdContact,
} from "@/lib/rfp-rubric";
import {
  spaceOptionLocations,
  type Grade,
  type RfpSession,
} from "@/lib/rfp-sessions";
import { findRfpSession } from "@/lib/rfp-sessions-api";
import type { Ages, Category } from "@/lib/schedule";

const CATEGORY_LABEL: Record<Category, string> = {
  talk: "Talk",
  workshop: "Workshop",
  game: "Game",
  other: "Other",
};

const AGES_LABEL: Record<Ages, string> = {
  all: "All ages",
  kids: "Kid-friendly",
  adults: "18+",
};

function Row({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: string;
  description?: string;
  /** Colour token — renders the value as its pill instead of plain text. */
  color?: string;
}) {
  const tone = swatch(color);
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink/45 uppercase">
        {label}
        {description && <InfoTip text={description} />}
      </dt>
      <dd className="mt-0.5 text-[15px] whitespace-pre-wrap text-ink/85">
        {tone ? (
          <span
            style={tone}
            className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
          >
            {value}
          </span>
        ) : (
          value
        )}
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

type DisplayRow = { label: string; value: string; description?: string };

function rowsFor<K extends string>(
  values: Record<K, string | null>,
  fields: readonly { key: K; label: string; description?: string }[],
): DisplayRow[] {
  return fields.flatMap((f) => {
    const value = values[f.key];
    return value === null || value === ""
      ? []
      : [{ label: f.label, value, description: f.description }];
  });
}

const num = (n: number | null) => (n === null ? null : String(n));

function contextOf(s: RfpSession): RfpContext {
  const { row } = s;
  return {
    title: s.title,
    host: s.hosts.map((h) => h.name).join(", ") || null,
    description: row.description,
    context: row.context,
    category: row.category ? CATEGORY_LABEL[row.category] : null,
    duration: row.requestedDuration,
    minimumSize: num(row.minCapacity),
    maximumSize: num(row.maxCapacity),
    ages: row.ages ? AGES_LABEL[row.ages] : null,
    ageElaboration: row.ageElaboration,
    needs: row.needs,
    timingConstraints: row.timingConstraints,
    otherConstraints: row.otherConstraints,
    applicationRequired: row.applicationRequired,
    bespokeNeeds: row.bespokeNeeds,
    megagameInterest: row.megagameInterest
      ? MEGAGAME_INTEREST_LABELS[row.megagameInterest]
      : null,
    anythingElse: row.anythingElse,
    website: s.hosts[0]?.website ?? null,
  };
}

function contactOf(s: RfpSession): ShepherdContact {
  const lead = s.hosts[0];
  return {
    email: lead?.email ?? null,
    discord: lead?.discordHandle ?? null,
    cohosts: s.row.cohosts,
  };
}

/** A grade's values keyed the way the form names them. */
function formValues(grade: Grade): Record<string, unknown> {
  return {
    ...grade,
    [SPACE_OPTIONS_FIELD]: grade.spaceOptions.map((s) => s.locationId),
  };
}

/** Another grader's grade, read-only, in the form's order. */
function gradeRows(grade: Grade, fields: readonly FormField[]): DisplayRow[] {
  const values = formValues(grade);
  const show = (f: FormField): string | null => {
    const v = values[f.key];
    if (f.key === SPACE_OPTIONS_FIELD) {
      return grade.spaceOptions.map((s) => s.name).join(", ") || null;
    }
    if (f.kind === "select") {
      return typeof v === "string" ? (f.options[v] ?? v) : null;
    }
    if (f.kind === "multiSelect") {
      return Array.isArray(v) && v.length > 0
        ? v.map((x) => f.options[String(x)] ?? String(x)).join(", ")
        : null;
    }
    return v === null || v === undefined || v === "" ? null : String(v);
  };
  return [
    ...RUBRIC_METRICS.flatMap((m) =>
      grade[m.key]
        ? [{ label: m.label, value: RUBRIC_GRADE_LABELS[grade[m.key]!] }]
        : [],
    ),
    ...fields.flatMap((f) => {
      const value = show(f);
      return value === null ? [] : [{ label: f.label, value }];
    }),
  ];
}

export default async function SubmissionPage(props: PageProps<"/grade/[id]">) {
  const access = await gradeAccess();
  if (!access?.identity) redirect("/grade");

  const { id } = await props.params;
  const rfpSession = await findRfpSession(id);
  if (!rfpSession) notFound();
  // Record ids and slugs still resolve, but the session id is the address.
  if (id !== rfpSession.sessionId) redirect(`/grade/${rfpSession.sessionId}`);

  const [me, spaces] = await Promise.all([
    graderUserId(access),
    spaceOptionLocations(),
  ]);
  const spaceOptions = Object.fromEntries(spaces.map((s) => [s.id, s.label]));
  const mine = rfpSession.grades.find((g) => g.grader.userId === me) ?? null;
  const others = rfpSession.grades.filter((g) => g !== mine);
  const blocked =
    me === null
      ? access.identity.kind === "grader"
        ? `${access.identity.name} has no account yet, so a grade can't be saved under that name. Sign in with your account to grade.`
        : "Sign in with your account to grade: a grade has to be someone's."
      : null;

  const row = toRow(rfpSession);
  const picture = rfpSession.hosts[0]?.imageUrl ?? null;
  const graders = rfpSession.grades.map(
    (g) =>
      `${committeeLabel(g.grader)}${g.submittedAt ? "" : " (not graded yet)"}`,
  );
  const contactRows = rowsFor(contactOf(rfpSession), SHEPHERD_CONTACT_FIELDS);
  const { row: session } = rfpSession;

  return (
    <div className="space-y-8">
      <Link href="/grade" className="text-sm text-ink/55 hover:text-meeple">
        ← All proposals
      </Link>

      <header className="flex items-start gap-4">
        {picture && (
          // Blob URLs off-domain; a plain img rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={picture}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="font-bebas text-3xl tracking-wide text-navy">
            {rfpSession.title}
          </h1>
          <p className="text-ink/60">{row.host}</p>
        </div>
      </header>

      <Panel>
        <Row
          label={graders.length > 1 ? "Graders" : "Grader"}
          value={graders.join(", ") || "Unassigned"}
          description="The committee members assigned to grade this proposal. Assigned from the overview."
        />
        {/* The verdict is the committee's call, made from the overview, not
            a grader's from inside their own rubric. Next steps is read-only
            here too, but the save bar below can advance it out of grading. */}
        <Row
          label="Verdict"
          value={row.verdict ?? "Not set"}
          color={PIPELINE_COLORS.verdict[row.verdict ?? ""]}
          description="The committee's decision on this session. Set from the overview, not here."
        />
        <Row
          label="Next steps"
          value={row.nextSteps ?? "Not set"}
          color={PIPELINE_COLORS.nextSteps[row.nextSteps ?? ""]}
          description="Where this is in the processing pipeline. Set from the overview, or advanced past grading when you save below."
        />
        {session.rickiNotes && (
          <Row
            label="Ricki’s notes"
            value={session.rickiNotes}
            description="Miscellaneous notes from Ricki that might be relevant."
          />
        )}
      </Panel>

      <Panel title="Request for Proposals submission">
        {rowsFor(contextOf(rfpSession), CONTEXT_FIELDS).map((r) => (
          <Row key={r.label} {...r} />
        ))}
      </Panel>

      {others.map((grade) => (
        <Panel
          key={grade.grader.userId}
          title={`${committeeLabel(grade.grader)}’s grade`}
        >
          {grade.submittedAt ? (
            gradeRows(grade, META_FIELDS).map((r) => (
              <Row key={r.label} {...r} />
            ))
          ) : (
            <p className="text-sm text-ink/55">Assigned, not graded yet.</p>
          )}
        </Panel>
      ))}

      <GradeForm
        sessionId={rfpSession.sessionId}
        initial={mine ? formValues(mine) : {}}
        spaceOptions={spaceOptions}
        notes={{
          communicationNotes: session.communicationNotes,
          housingStatus: session.housingStatus,
          ticketState: session.ticketState,
          [MARKETING_CONSENT_FIELD]: session.marketingConsent,
        }}
        shepherdContact={
          contactRows.length > 0 && (
            <dl className="space-y-3">
              {contactRows.map((r) => (
                <Row key={r.label} {...r} />
              ))}
            </dl>
          )
        }
        phase={rfpSession.phase}
        blocked={blocked}
        notesFields={SHEPHERD_NOTES_FIELDS}
      />
    </div>
  );
}
