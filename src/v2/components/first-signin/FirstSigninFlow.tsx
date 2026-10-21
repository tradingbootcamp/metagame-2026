"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { claim, claimMine, type ClaimState } from "@/app/(v2)/account/actions";
import {
  firstSigninHidden,
  type FirstSigninStatus,
  type TicketStep,
} from "@/lib/first-signin";
import {
  TICKET_CODE_LENGTH,
  normalizeTicketCode,
} from "@/lib/ticket-code-format";
import PinInput from "@/v2/components/auth/PinInput";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import { HEADING, NEWSLETTER_LINK } from "../styles";
import { saveIsAdult } from "./actions";

const TICKETS_HREF = "/#tickets";

// Asked from the client so the layout stays static. Re-asked on leaving
// /login, since signing in navigates client-side and the layout never remounts.
export default function FirstSigninFlow() {
  const pathname = usePathname();
  const hidden = firstSigninHidden(pathname);
  const [tickets, setTickets] = useState<TicketStep | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (hidden || tickets || done) return;
    let live = true;
    fetch("/api/first-signin")
      .then((res) => (res.ok ? res.json() : { needed: false }))
      .then((body: FirstSigninStatus) => {
        if (live && body.needed) setTickets(body.tickets);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [hidden, tickets, done]);

  if (!tickets || done || hidden) return null;
  return <FirstSigninModal tickets={tickets} onFinish={() => setDone(true)} />;
}

function FirstSigninModal({
  tickets,
  onFinish,
}: {
  tickets: TicketStep;
  onFinish: () => void;
}) {
  const [step, setStep] = useState<"adult" | "tickets">("adult");
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="flex max-w-[520px] flex-col gap-5 px-6 py-7 sm:px-9 sm:py-8"
      >
        {step === "adult" ? (
          <AdultStep onAnswered={() => setStep("tickets")} />
        ) : (
          <TicketsStep tickets={tickets} onFinish={onFinish} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdultStep({ onAnswered }: { onAnswered: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const answer = (isAdult: boolean) =>
    start(async () => {
      const result = await saveIsAdult(isAdult).catch(() => ({
        error: "We couldn't save that. Try again.",
      }));
      if (result.error) setError(result.error);
      else onAnswered();
    });

  return (
    <>
      <div>
        <DialogTitle className={`${HEADING} text-[28px] text-cream`}>
          Welcome to Metagame
        </DialogTitle>
        <DialogDescription className="mt-2 text-[15px] text-cream/80">
          One quick question before you start: are you 18 or older?
        </DialogDescription>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={() => answer(true)}>
          Yes, I&apos;m 18 or older
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => answer(false)}
        >
          No, I&apos;m under 18
        </Button>
      </div>
      {error && (
        <p aria-live="polite" className="text-sm text-salmon">
          {error}
        </p>
      )}
    </>
  );
}

function TicketsStep({
  tickets,
  onFinish,
}: {
  tickets: TicketStep;
  onFinish: () => void;
}) {
  const [claimed, setClaimed] = useState<string>();

  if (tickets.kind === "held" || claimed) {
    return (
      <>
        <div>
          <DialogTitle className={`${HEADING} text-[28px] text-cream`}>
            You&apos;re all set
          </DialogTitle>
          <DialogDescription className="mt-2 text-[15px] text-cream/80">
            {claimed
              ? `${claimed} is now yours.`
              : "You already have a ticket."}{" "}
            See you at Metagame.
          </DialogDescription>
        </div>
        <div>
          <Button onClick={onFinish}>Done</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <DialogTitle className={`${HEADING} text-[28px] text-cream`}>
          Claim your ticket
        </DialogTitle>
        <DialogDescription className="mt-2 text-[15px] text-cream/80">
          {tickets.kind === "claimable"
            ? "You bought these. Claim one to attend on it, or pass its code on from your account page."
            : "Got a ticket code? Enter it to claim the ticket for your account."}
        </DialogDescription>
      </div>
      {tickets.kind === "claimable" ? (
        <ClaimMine tickets={tickets.tickets} onClaimed={setClaimed} />
      ) : (
        <ClaimByCode onClaimed={setClaimed} />
      )}
      <p className="text-sm text-cream/70">
        No ticket yet? That&apos;s fine, you can{" "}
        <Link
          href={TICKETS_HREF}
          onClick={onFinish}
          className={NEWSLETTER_LINK}
        >
          buy one
        </Link>{" "}
        any time.
      </p>
      <div>
        <Button variant="ghost" size="sm" onClick={onFinish}>
          I&apos;ll do this later
        </Button>
      </div>
    </>
  );
}

function ClaimMine({
  tickets,
  onClaimed,
}: {
  tickets: { id: string; tier: string }[];
  onClaimed: (tier: string) => void;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ClaimState>({});
  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-cream/15 rounded-lg border border-cream/15">
        {tickets.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="font-semibold text-cream">{t.tier}</span>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await claimMine(t.id);
                  setState(result);
                  if (result.claimed) onClaimed(result.claimed);
                })
              }
            >
              {pending ? "Claiming…" : "Claim"}
            </Button>
          </li>
        ))}
      </ul>
      {state.error && (
        <p aria-live="polite" className="text-sm text-salmon">
          {state.error}
        </p>
      )}
    </div>
  );
}

function ClaimByCode({ onClaimed }: { onClaimed: (tier: string) => void }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(
    async (prev, formData) => {
      const result = await claim(prev, formData);
      if (result.claimed) onClaimed(result.claimed);
      return result;
    },
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Ticket code">
          <PinInput
            name="code"
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
      {state.error && (
        <p aria-live="polite" className="text-sm text-salmon">
          {state.error}
        </p>
      )}
    </form>
  );
}
