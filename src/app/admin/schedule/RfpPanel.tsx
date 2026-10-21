"use client";

import { useEffect, useState } from "react";
import { rfpLinks } from "@/lib/rfp-links";
import type { ScheduleAccount } from "@/lib/schedule";
import { loadSchedulerNotes, type SchedulerNotes } from "./actions";

const MUTED = "text-xs text-ink/50";
const LINK = "font-medium text-navy underline";

/** The session's RFP: links out, its shepherd, and the grader's notes for the scheduler. */
export default function RfpPanel({
  recordId,
  shepherd,
}: {
  recordId: string | null;
  shepherd: ScheduleAccount | null;
}) {
  const [result, setResult] = useState<SchedulerNotes | null>(null);

  useEffect(() => {
    if (!recordId) return;
    let live = true;
    loadSchedulerNotes(recordId)
      .catch(() => ({ error: "Couldn’t load Airtable record" }))
      .then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [recordId]);

  const shepherdLine = shepherd && (
    <p className="text-ink/85">
      <span className="text-ink/50">Shepherd:</span> {shepherd.name}
    </p>
  );

  if (!recordId) {
    return (
      <div className="flex flex-col gap-1 text-sm sm:col-span-2">
        <p className={MUTED}>No RFP linked</p>
        {shepherdLine}
      </div>
    );
  }
  const links = rfpLinks(recordId);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-cream/40 px-3 py-2.5 text-sm sm:col-span-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <a href={links.grade} target="_blank" className={LINK}>
          Grading page
        </a>
        <a
          href={links.airtable}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK}
        >
          Airtable record
        </a>
      </div>
      {shepherdLine}
      {!result ? (
        <p className={MUTED}>Loading grader notes…</p>
      ) : "error" in result ? (
        <p className={MUTED}>{result.error}</p>
      ) : (
        result.notes && (
          <div>
            <p className="mb-0.5 text-xs font-medium tracking-wide text-ink/50 uppercase">
              Grader notes for scheduler
            </p>
            <p className="whitespace-pre-wrap text-ink/85">{result.notes}</p>
          </div>
        )
      )}
    </div>
  );
}
