"use client";

import { useMemo, useState } from "react";
import { shortDate, TAG } from "../tickets/parts";
import { fieldClass, selectClass, selectStyle } from "../ui";
import type { ChildEntry, ChildrenData, Family } from "@/lib/children";
import { Dialog, DialogContent, DialogTitle } from "@/v2/components/ui/dialog";
import { OTHER_SESSION, SESSION_NAMES } from "@/v2/forms/children";

type CareFilter = "all" | "yes" | "no";
type LongText = { title: string; text: string };
type OpenText = (t: LongText) => void;

const CHILDCARE_MIN_AGE = 5;
const CHILDCARE_MAX_AGE = 12;
// Halves are allowed on the form, so 12.5 is still 12.
const outsideChildcareAges = (age: number | null) =>
  age !== null && (age < CHILDCARE_MIN_AGE || age >= CHILDCARE_MAX_AGE + 1);

const needsChildcare = (c: ChildEntry) => c.sessions.length > 0;

const SESSION_SHORT: Record<(typeof SESSION_NAMES)[number], string> = {
  [SESSION_NAMES[0]]: "Fri PM",
  [SESSION_NAMES[1]]: "Sat AM",
  [SESSION_NAMES[2]]: "Sat PM",
  [SESSION_NAMES[3]]: "Sun AM",
  [SESSION_NAMES[4]]: "Sun PM",
};
const SESSION_OPTIONS = [...SESSION_NAMES, OTHER_SESSION];
// Anything the form doesn't offer (a relabelled option, say) counts as Other,
// for the chips, the filter and the counts alike.
const sessionShort = (s: string): string =>
  (SESSION_SHORT as Record<string, string>)[s] ?? OTHER_SESSION;
const inSession = (c: ChildEntry, s: string) =>
  c.sessions.some((x) => sessionShort(x) === sessionShort(s));

const HEADERS = [
  "Parent",
  "Contact",
  "Family notes",
  "Registered",
  "Child",
  "Age",
  "Childcare",
  "Medical",
  "Notes",
];

const childCount = (n: number) => `${n} ${n === 1 ? "child" : "children"}`;

const Empty = () => <span className="text-ink/40">—</span>;

const CELL = "px-3 py-2";

export default function ChildrenTool({ data }: { data: ChildrenData }) {
  const [q, setQ] = useState("");
  const [care, setCare] = useState<CareFilter>("all");
  const [session, setSession] = useState("");
  const [open, setOpen] = useState<LongText | null>(null);

  const { children, unlisted } = data;

  // Families keep their newest-first order; a filter only shrinks a block.
  const blocks = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: { family: Family; rows: ChildEntry[] }[] = [];
    for (const c of children) {
      if (care === "yes" && !needsChildcare(c)) continue;
      if (care === "no" && needsChildcare(c)) continue;
      if (session && !inSession(c, session)) continue;
      if (
        needle &&
        ![c.name, c.family.parentName, c.family.email].some((s) =>
          s.toLowerCase().includes(needle),
        )
      )
        continue;
      const last = out.at(-1);
      if (last?.family.recordId === c.family.recordId) last.rows.push(c);
      else out.push({ family: c.family, rows: [c] });
    }
    return out;
  }, [children, q, care, session]);
  const shown = blocks.reduce((n, b) => n + b.rows.length, 0);

  const wanting = children.filter(needsChildcare).length;
  const perSession = SESSION_OPTIONS.map((s) => ({
    name: s,
    count: children.filter((c) => inSession(c, s)).length,
  })).filter((s) => s.count > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">
        <strong className="text-ink">{childCount(children.length)}</strong>{" "}
        registered, {wanting} wanting childcare
        {perSession.length > 0 && (
          <>
            {" "}
            (
            {perSession
              .map((s) => `${sessionShort(s.name)} ${s.count}`)
              .join(", ")}
            )
          </>
        )}
        .
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search child, parent or email"
          className={`${fieldClass} max-w-sm`}
        />
        <select
          value={care}
          onChange={(e) => setCare(e.target.value as CareFilter)}
          className={selectClass}
          style={selectStyle}
          aria-label="Childcare"
        >
          <option value="all">All children</option>
          <option value="yes">Needs childcare</option>
          <option value="no">No childcare</option>
        </select>
        <select
          value={session}
          onChange={(e) => setSession(e.target.value)}
          className={selectClass}
          style={selectStyle}
          aria-label="Session"
        >
          <option value="">Any session</option>
          {SESSION_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {sessionShort(s)}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink/60">
          {shown} of {children.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              {HEADERS.map((h) => (
                <th key={h} className={`${CELL} font-medium`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {blocks.map(({ family, rows }) => (
            <tbody
              key={family.recordId}
              className="border-t-2 border-line align-top"
            >
              {rows.map((c, i) => (
                <ChildRow
                  key={c.key}
                  c={c}
                  familySpan={i === 0 ? rows.length : 0}
                  onOpen={setOpen}
                />
              ))}
            </tbody>
          ))}
          {shown === 0 && (
            <tbody>
              <tr>
                <td
                  colSpan={HEADERS.length}
                  className="px-3 py-6 text-center text-ink/50"
                >
                  {children.length === 0
                    ? "No children registered yet."
                    : "No children match."}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {unlisted.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bebas text-xl tracking-wide text-navy">
            More children, not in the table
          </h2>
          <p className="text-sm text-ink/60">
            Families with more than four children describe the rest in free
            text; some declared more children than they listed.
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm shadow-sm">
            {unlisted.map((f) => (
              <FamilyNote key={f.recordId} f={f} onOpen={setOpen} />
            ))}
          </ul>
        </section>
      )}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="flex max-w-[520px] flex-col gap-4 px-6 py-6"
        >
          {open && (
            <>
              <DialogTitle className="font-bebas pr-8 text-2xl tracking-wide text-cream">
                {open.title}
              </DialogTitle>
              <p className="max-h-[70vh] overflow-y-auto text-sm whitespace-pre-line">
                {open.text}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Two lines of text; the whole thing opens in the modal. */
function Clamp({
  text,
  title,
  onOpen,
  className = "",
}: {
  text: string;
  title: string;
  onOpen: OpenText;
  className?: string;
}) {
  if (!text) return <Empty />;
  return (
    <button
      type="button"
      onClick={() => onOpen({ title, text })}
      title="Show all"
      className={`block cursor-pointer text-left underline decoration-ink/30 decoration-dotted underline-offset-2 hover:text-navy hover:decoration-navy ${className}`}
    >
      <span className="line-clamp-2 whitespace-pre-line">{text}</span>
    </button>
  );
}

function ChildRow({
  c,
  familySpan,
  onOpen,
}: {
  c: ChildEntry;
  /** Rows the family cells span; 0 on a sibling row, which gets a thin
   * divider on its own cells so the family block stays unbroken. */
  familySpan: number;
  onOpen: OpenText;
}) {
  const flag = needsChildcare(c) && outsideChildcareAges(c.age);
  const cell = familySpan ? CELL : `${CELL} border-t border-line`;
  return (
    <tr>
      {familySpan > 0 && (
        <FamilyCells f={c.family} span={familySpan} onOpen={onOpen} />
      )}
      <td className={`${cell} font-medium whitespace-nowrap`}>{c.name}</td>
      <td className={`${cell} whitespace-nowrap tabular-nums`}>
        {c.age ?? <Empty />}
        {flag && (
          <span
            className={`${TAG} ml-1.5 bg-amber-100 text-amber-900`}
            title={`Childcare is for ages ${CHILDCARE_MIN_AGE} to ${CHILDCARE_MAX_AGE}; needs a decision.`}
          >
            outside {CHILDCARE_MIN_AGE}–{CHILDCARE_MAX_AGE}
          </span>
        )}
      </td>
      <td className={cell}>
        {c.sessions.length === 0 ? (
          <Empty />
        ) : (
          <span className="flex flex-wrap gap-1">
            {c.sessions.map((s) => (
              <span key={s} className={`${TAG} bg-navy/10 text-navy`} title={s}>
                {sessionShort(s)}
              </span>
            ))}
          </span>
        )}
      </td>
      <td className={`${cell} max-w-[14rem]`}>
        <Clamp text={c.medical} title={`${c.name}: medical`} onOpen={onOpen} />
      </td>
      <td className={`${cell} max-w-[14rem]`}>
        <Clamp text={c.notes} title={`${c.name}: notes`} onOpen={onOpen} />
      </td>
    </tr>
  );
}

function FamilyCells({
  f,
  span,
  onOpen,
}: {
  f: Family;
  span: number;
  onOpen: OpenText;
}) {
  return (
    <>
      <td rowSpan={span} className={CELL}>
        <div className="whitespace-nowrap">{f.parentName || <Empty />}</div>
        {f.relationship && (
          <div className="text-xs text-ink/60">{f.relationship}</div>
        )}
      </td>
      <td rowSpan={span} className={CELL}>
        <Contact f={f} />
      </td>
      <td rowSpan={span} className={`${CELL} max-w-[14rem]`}>
        <Clamp
          text={f.anythingElse}
          title={`${f.parentName || "Family"}: anything else`}
          onOpen={onOpen}
        />
      </td>
      <td rowSpan={span} className={`${CELL} whitespace-nowrap text-ink/70`}>
        {shortDate.format(new Date(f.createdTime))}
      </td>
    </>
  );
}

function Contact({ f }: { f: Family }) {
  return (
    <div className="space-y-0.5 text-xs">
      {f.email && (
        <div>
          <a
            href={`mailto:${f.email}`}
            className="text-navy hover:text-meeple hover:underline"
          >
            {f.email}
          </a>
        </div>
      )}
      {f.phone && (
        <div className="whitespace-nowrap">
          <a href={`tel:${f.phone}`} className="hover:underline">
            {f.phone}
          </a>
        </div>
      )}
      {f.discord && <div className="text-ink/70">{f.discord}</div>}
    </div>
  );
}

function FamilyNote({ f, onOpen }: { f: Family; onOpen: OpenText }) {
  const who = f.parentName || "(no name)";
  return (
    <li className="space-y-1 px-4 py-3">
      <div>
        <span className="font-medium">{who}</span>
        {f.count !== null && (
          <span className="text-ink/60"> · {childCount(f.count)} declared</span>
        )}
      </div>
      <Contact f={f} />
      {f.moreChildren ? (
        <Clamp
          text={f.moreChildren}
          title={`${who}: other children`}
          onOpen={onOpen}
          className="max-w-prose"
        />
      ) : (
        <p className="text-ink/60">No details given for the rest.</p>
      )}
    </li>
  );
}
