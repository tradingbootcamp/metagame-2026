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
import { SESSION_NAMES } from "@/v2/forms/children";

type CareFilter = "all" | "yes" | "no";

const SESSION_OPTIONS = [...SESSION_NAMES, "Other"];

const childCount = (n: number) => `${n} ${n === 1 ? "child" : "children"}`;

const Empty = () => <span className="text-ink/40">—</span>;

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

  const { children, families } = data;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return children.filter((c) => {
      if (care === "yes" && !needsChildcare(c)) return false;
      if (care === "no" && needsChildcare(c)) return false;
      if (session && !c.sessions.includes(session)) return false;
      if (!needle) return true;
      return [c.name, c.family.parentName, c.family.email].some((s) =>
        s.toLowerCase().includes(needle),
      );
    });
  }, [children, q, care, session]);

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
          {rows.length} of {children.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Child</th>
              <th className="px-3 py-2 font-medium">Age</th>
              <th className="px-3 py-2 font-medium">Childcare</th>
              <th className="px-3 py-2 font-medium">Medical</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium">Parent</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {rows.map((c) => (
              <ChildRow key={c.key} c={c} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-ink/50">
                  {children.length === 0
                    ? "No children registered yet."
                    : "No children match."}
                </td>
              </tr>
            )}
          </tbody>
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
              <FamilyNote key={f.recordId} f={f} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ChildRow({ c }: { c: ChildEntry }) {
  const f = c.family;
  const flag = needsChildcare(c) && outsideChildcareAges(c.age);
  return (
    <tr>
      <td className="px-3 py-2 font-medium whitespace-nowrap">{c.name}</td>
      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
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
      <td className="px-3 py-2">
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
      <td className="max-w-[16rem] px-3 py-2 break-words whitespace-pre-line">
        {c.medical || <Empty />}
      </td>
      <td className="max-w-[16rem] px-3 py-2 break-words whitespace-pre-line">
        {c.notes || (f.anythingElse ? null : <Empty />)}
        {f.anythingElse && (
          <div className="text-xs text-ink/60">Family: {f.anythingElse}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="whitespace-nowrap">{f.parentName || "—"}</div>
        {f.relationship && (
          <div className="text-xs text-ink/60">{f.relationship}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <Contact f={f} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-ink/70">
        {shortDate.format(new Date(f.createdTime))}
      </td>
    </tr>
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

function FamilyNote({ f }: { f: Family }) {
  return (
    <li className="space-y-1 px-4 py-3">
      <div>
        <span className="font-medium">{f.parentName || "(no name)"}</span>
        {f.count !== null && (
          <span className="text-ink/60"> · {childCount(f.count)} declared</span>
        )}
      </div>
      <Contact f={f} />
      {f.moreChildren ? (
        <p className="whitespace-pre-line">{f.moreChildren}</p>
      ) : (
        <p className="text-ink/60">No details given for the rest.</p>
      )}
      {f.anythingElse && (
        <p className="whitespace-pre-line text-ink/70">
          Anything else: {f.anythingElse}
        </p>
      )}
    </li>
  );
}
