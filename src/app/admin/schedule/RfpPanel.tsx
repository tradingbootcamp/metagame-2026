"use client";

import { useEffect, useState } from "react";
import { airtableRfpLink, gradeLink } from "@/lib/rfp-links";
import type { ScheduleAccount } from "@/lib/schedule";
import { loadSchedulerNotes, type SchedulerNotes } from "./actions";

const MUTED = "text-xs text-ink/50";
const LINK = "font-medium text-navy underline";

/** The session's RFP: links out, its shepherd, and the graders' notes for the scheduler. */
export default function RfpPanel({
  sessionId,
  recordId,
  shepherd,
}: {
  sessionId: string;
  recordId: string | null;
  shepherd: ScheduleAccount | null;
}) {
  const [result, setResult] = useState<SchedulerNotes | null>(null);

  useEffect(() => {
    let live = true;
    loadSchedulerNotes(sessionId)
      .catch(() => ({ error: "Couldn’t load the grades" }))
      .then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [sessionId]);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-cream/40 px-3 py-2.5 text-sm sm:col-span-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {(recordId ||
          (result && "inPipeline" in result && result.inPipeline)) && (
          <a href={gradeLink(sessionId)} target="_blank" className={LINK}>
            Grading page
          </a>
        )}
        {recordId ? (
          <a
            href={airtableRfpLink(recordId)}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            Airtable record
          </a>
        ) : (
          <span className={MUTED}>No RFP linked</span>
        )}
      </div>
      {shepherd && (
        <p className="text-ink/85">
          <span className="text-ink/50">Shepherd:</span> {shepherd.name}
        </p>
      )}
      {!result ? (
        <p className={MUTED}>Loading grader notes…</p>
      ) : "error" in result ? (
        <p className={MUTED}>{result.error}</p>
      ) : (
        result.notes.length > 0 && (
          <div>
            <p className="mb-0.5 text-xs font-medium tracking-wide text-ink/50 uppercase">
              Grader notes for scheduler
            </p>
            {result.notes.map((n) => (
              <p
                key={n.graderUserId}
                className="whitespace-pre-wrap text-ink/85"
              >
                {result.notes.length > 1 && (
                  <span className="text-ink/50">{n.grader}: </span>
                )}
                {n.text}
              </p>
            ))}
          </div>
        )
      )}
    </div>
  );
}
