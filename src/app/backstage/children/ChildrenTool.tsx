"use client";

import { useMemo, useState } from "react";
import { shortDate, TAG } from "../tickets/parts";
import { fieldClass, selectClass, selectStyle } from "../ui";
import {
  CHILDCARE_MAX_AGE,
  CHILDCARE_MIN_AGE,
  needsChildcare,
  outsideChildcareAges,
  sessionShort,
  type ChildEntry,
  type ChildrenData,
  type Family,
} from "@/lib/children";
import { Dialog, DialogContent, DialogTitle } from "@/v2/components/ui/dialog";
import { SESSION_NAMES } from "@/v2/forms/children";

type CareFilter = "all" | "yes" | "no";
type LongText = { title: string; text: string };
type OpenText = (t: LongText) => void;

const SESSION_OPTIONS = [...SESSION_NAMES, "Other"];

const childCount = (n: number) => `${n} ${n === 1 ? "child" : "children"}`;

const Empty = () => <span className="text-ink/40">—</span>;

const CELL = "px-3 py-2";

export default function ChildrenTool({
  data,
  error,
}: {
  data: ChildrenData;
  error: string | null;
}) {
  const [q, setQ] = useState("");
  const [care, setCare] = useState<CareFilter>("all");
  const [session, setSession] = useState("");
  const [open, setOpen] = useState<LongText | null>(null);

  const { children, families } = data;

  // Families keep their newest-first order; a filter only shrinks a block.
  const blocks = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: { family: Family; rows: ChildEntry[] }[] = [];
    for (const c of children) {
      if (care === "yes" && !needsChildcare(c)) continue;
      if (care === "no" && needsChildcare(c)) continue;
      if (session && !c.sessions.includes(session)) continue;
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
    count: children.filter((c) => c.sessions.includes(s)).length,
  })).filter((s) => s.count > 0);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Couldn&rsquo;t read the Children table: {error}
      </p>
    );
  }

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
              <th className={`${CELL} font-medium`}>Child</th>
              <th className={`${CELL} font-medium`}>Age</th>
              <th className={`${CELL} font-medium`}>Childcare</th>
              <th className={`${CELL} font-medium`}>Medical</th>
              <th className={`${CELL} font-medium`}>Notes</th>
              <th className={`${CELL} font-medium`}>Parent</th>
              <th className={`${CELL} font-medium`}>Contact</th>
              <th className={`${CELL} font-medium`}>Family notes</th>
              <th className={`${CELL} font-medium`}>Registered</th>
            </tr>
          </thead>
          {blocks.map(({ family, rows }) => (
            <tbody
              key={family.recordId}
              className="border-t border-line align-top"
            >
              {rows.map((c, i) => (
                <ChildRow
                  key={c.key}
                  c={c}
                  family={i === 0 ? { f: family, span: rows.length } : null}
                  onOpen={setOpen}
                />
              ))}
            </tbody>
          ))}
          {shown === 0 && (
            <tbody>
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-ink/50">
                  {children.length === 0
                    ? "No children registered yet."
                    : "No children match."}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {families.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bebas text-xl tracking-wide text-navy">
            More children, not in the table
          </h2>
          <p className="text-sm text-ink/60">
            Families with more than four children describe the rest in free
            text; some declared more children than they listed.
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm shadow-sm">
            {families.map((f) => (
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
  family,
  onOpen,
}: {
  c: ChildEntry;
  /** Set on a family's first row; the family cells span its siblings. */
  family: { f: Family; span: number } | null;
  onOpen: OpenText;
}) {
  const flag = needsChildcare(c) && outsideChildcareAges(c.age);
  return (
    <tr>
      <td className={`${CELL} font-medium whitespace-nowrap`}>{c.name}</td>
      <td className={`${CELL} whitespace-nowrap tabular-nums`}>
        {c.age ?? "—"}
        {flag && (
          <span
            className={`${TAG} ml-1.5 bg-amber-100 text-amber-900`}
            title={`Childcare is for ages ${CHILDCARE_MIN_AGE} to ${CHILDCARE_MAX_AGE}; needs a decision.`}
          >
            outside {CHILDCARE_MIN_AGE}–{CHILDCARE_MAX_AGE}
          </span>
        )}
      </td>
      <td className={CELL}>
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
      <td className={`${CELL} max-w-[14rem]`}>
        <Clamp text={c.medical} title={`${c.name}: medical`} onOpen={onOpen} />
      </td>
      <td className={`${CELL} max-w-[14rem]`}>
        <Clamp text={c.notes} title={`${c.name}: notes`} onOpen={onOpen} />
      </td>
      {family && <FamilyCells {...family} onOpen={onOpen} />}
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
        <div className="whitespace-nowrap">{f.parentName || "—"}</div>
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
      {f.anythingElse && (
        <div className="text-ink/70">
          <span className="text-xs text-ink/50">Anything else:</span>{" "}
          <Clamp
            text={f.anythingElse}
            title={`${who}: anything else`}
            onOpen={onOpen}
            className="max-w-prose"
          />
        </div>
      )}
    </li>
  );
}
