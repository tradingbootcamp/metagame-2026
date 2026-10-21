"use client";

import { useActionState, useState, useTransition } from "react";
import { claim, claimMine, type ClaimState } from "./actions";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/v2/components/ui/button";
import PinInput from "@/v2/components/auth/PinInput";
import {
  TICKET_CODE_LENGTH,
  normalizeTicketCode,
} from "@/lib/ticket-code-format";
import type { TicketRow } from "@/lib/ticket-store";
import { useCopy } from "@/v2/lib/use-copy";

export type TicketView = {
  id: string;
  tier: string;
  status: TicketRow["status"];
  test: boolean;
  /** Claimed by the signed-in user. */
  mine: boolean;
  claimed: boolean;
  /** Set when the signed-in user bought it. */
  code: string | null;
};

/** Bought by the viewer, paid, and nobody's claimed it yet. */
const shareable = (t: TicketView) =>
  t.code !== null && !t.claimed && t.status === "paid";

function badge(t: TicketView): { text: string; tone: string } {
  if (t.status !== "paid")
    return { text: t.status, tone: "bg-tan/30 text-ink" };
  if (t.mine) return { text: "Yours", tone: "bg-moss/20 text-moss" };
  if (t.claimed) return { text: "Claimed", tone: "bg-navy/10 text-navy" };
  return { text: "Unclaimed", tone: "bg-meeple/10 text-meeple" };
}

/** The buyer's code, to copy and pass on to whoever's attending. */
function ShareCode({ code }: { code: string }) {
  const { status, copy } = useCopy();
  const Icon = status === "copied" ? CheckIcon : CopyIcon;
  return (
    <span className="flex items-center gap-1.5 text-sm text-ink/70">
      Share code to transfer:
      <span className="font-mono text-ink">{code}</span>
      <button
        type="button"
        onClick={() => copy(code)}
        aria-label={status === "copied" ? "Copied" : "Copy code"}
        title={status === "failed" ? "Couldn't copy" : "Copy code"}
        className="rounded p-1 text-navy/70 hover:bg-navy/10 hover:text-navy"
      >
        <Icon
          className={`size-4 ${status === "failed" ? "text-meeple" : ""}`}
        />
      </button>
    </span>
  );
}

export default function TicketsPanel({ tickets }: { tickets: TicketView[] }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(
    claim,
    {},
  );
  const [claiming, startClaim] = useTransition();
  const [mineState, setMineState] = useState<ClaimState>({});
  // One admission per person, so offer it only until they hold a ticket.
  const holdsOne = tickets.some((t) => t.mine);

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
                {shareable(t) && !holdsOne && (
                  <Button
                    size="sm"
                    disabled={claiming}
                    onClick={() =>
                      startClaim(async () =>
                        setMineState(await claimMine(t.id)),
                      )
                    }
                    className="bg-moss px-3 py-1 hover:bg-moss/85"
                  >
                    {claiming ? "Claiming…" : "Claim"}
                  </Button>
                )}
                {shareable(t) && (
                  <span className="ml-auto">
                    <ShareCode code={t.code!} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {(mineState.error || mineState.claimed) && (
        <p aria-live="polite" className="text-sm">
          {mineState.error ? (
            <span className="text-meeple">{mineState.error}</span>
          ) : (
            <span className="text-ink/70">
              {mineState.claimed} is now yours.
            </span>
          )}
        </p>
      )}
      <form action={action} className="flex flex-col gap-2">
        <label
          id="code-label"
          className="text-sm font-semibold text-navy"
          htmlFor="code"
        >
          Have a ticket code? Claim it here.
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-labelledby="code-label">
            <PinInput
              name="code"
              id="code"
              length={TICKET_CODE_LENGTH}
              dashAfter={3}
              alphanumeric
              normalize={normalizeTicketCode}
              autoFocus={false}
              disabled={pending}
            />
          </div>
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
