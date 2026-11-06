"use client";

import { useState, useTransition } from "react";
import { lookUpTicket } from "./actions";
import { buttonClass, fieldClass } from "../ui";
import type { DoorResult, DoorTicket } from "@/lib/door-lookup";
import { sharesAName, type TicketState } from "@/lib/ticket-holder";

const NOT_VALID: Record<Exclude<TicketState, "paid">, string> = {
  voided: "This ticket was voided or refunded.",
  pending: "The payment hasn't settled yet.",
  failed: "The payment failed.",
  underpaid: "The payment came up short.",
};

/** Searches go by POST so emails and names stay out of URLs and logs. */
export default function DoorLookup() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DoorResult | null>(null);
  const [busy, start] = useTransition();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            try {
              setResult(await lookUpTicket(query));
            } catch {
              setResult({ error: "Couldn't reach the server. Try again." });
            }
          });
        }}
        className="space-y-3"
      >
        <label htmlFor="door-query" className="block text-sm text-ink/70">
          Ticket code, or the person&apos;s exact email or full name
        </label>
        <input
          id="door-query"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={fieldClass}
        />
        <button type="submit" disabled={busy} className={buttonClass}>
          {busy ? "Checking…" : "Check"}
        </button>
      </form>

      <div aria-live="polite" className="space-y-3">
        {result &&
          ("error" in result ? (
            <p className="text-sm text-meeple">{result.error}</p>
          ) : (
            <>
              {result.tickets.length === 0 && (
                <p className="rounded-xl border border-line bg-white p-4">
                  No ticket found. Check the spelling, or ask for their ticket
                  code.
                </p>
              )}
              {result.tickets.map((t, i) => (
                <TicketCard key={i} ticket={t} />
              ))}
              {result.more && (
                <p className="text-sm text-ink/70">
                  More tickets match. Ask for their ticket code.
                </p>
              )}
              {!result.more && sharesAName(result.tickets) && (
                <p className="text-sm text-ink/70">
                  These share a name, and account names are self-set. Ask for
                  their ticket code.
                </p>
              )}
            </>
          ))}
      </div>
    </div>
  );
}

function TicketCard({ ticket: t }: { ticket: DoorTicket }) {
  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 ${t.valid ? "border-moss" : "border-meeple"}`}
    >
      <p
        className={`font-bebas text-3xl tracking-wide ${t.valid ? "text-moss" : "text-meeple"}`}
      >
        {t.valid ? "Valid" : "Not valid"}
      </p>
      {t.state !== "paid" && (
        <p className="text-sm text-meeple">{NOT_VALID[t.state]}</p>
      )}
      <p className="mt-2 text-lg font-semibold break-words">
        {t.holder ?? "No name on file"}
      </p>
      {!t.claimed && (
        <p className="text-sm text-ink/60">
          Not claimed yet, so this is the name it was bought or passed on under.
        </p>
      )}
      <p
        className={`mt-2 ${t.admits.kind === "full" ? "" : "font-semibold text-meeple"}`}
      >
        {t.admits.label}
      </p>
    </div>
  );
}
