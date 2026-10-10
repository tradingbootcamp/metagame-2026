"use client";

import { useActionState } from "react";
import { claim, type ClaimState } from "./actions";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import { FIELD_LIGHT } from "@/v2/components/styles";

export type TicketView = {
  id: string;
  tier: string;
  status: "pending" | "paid" | "failed" | "underpaid";
  test: boolean;
  /** Claimed by the signed-in user. */
  mine: boolean;
  claimed: boolean;
  /** Set when the signed-in user bought it. */
  code: string | null;
};

function badge(t: TicketView): { text: string; tone: string } {
  if (t.status !== "paid")
    return { text: t.status, tone: "bg-tan/30 text-ink" };
  if (t.mine) return { text: "Yours", tone: "bg-moss/20 text-moss" };
  if (t.claimed) return { text: "Claimed", tone: "bg-navy/10 text-navy" };
  return { text: "Unclaimed", tone: "bg-meeple/10 text-meeple" };
}

export default function TicketsPanel({ tickets }: { tickets: TicketView[] }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(
    claim,
    {},
  );

  return (
    <section className="mt-12 flex max-w-[960px] flex-col gap-4">
      <h2 className="font-grotesk text-2xl font-bold text-navy">Tickets</h2>
      {tickets.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {tickets.map((t) => {
            const b = badge(t);
            return (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
              >
                <span className="text-base font-semibold text-ink">
                  {t.tier}
                  {t.test && (
                    <span className="ml-2 text-xs font-normal text-ink/50">
                      test
                    </span>
                  )}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-semibold ${b.tone}`}
                >
                  {b.text}
                </span>
                {t.code && (
                  <span className="ml-auto text-sm text-ink/70">
                    Code <span className="font-mono text-ink">{t.code}</span>
                    {!t.claimed && " — give it to whoever's attending"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form action={action} className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-navy" htmlFor="code">
          Have a ticket code? Claim it here.
        </label>
        <div className="flex max-w-sm gap-2">
          <Input
            id="code"
            name="code"
            placeholder="A2C-4EF"
            autoComplete="off"
            maxLength={8}
            required
            className={`${FIELD_LIGHT} font-mono uppercase`}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Claiming…" : "Claim"}
          </Button>
        </div>
        <p aria-live="polite" className="min-h-5 text-sm">
          {state.error ? (
            <span className="text-meeple">{state.error}</span>
          ) : state.claimed ? (
            <span className="text-ink/70">{state.claimed} is now yours.</span>
          ) : null}
        </p>
      </form>
    </section>
  );
}
