"use client";

import { useState, useTransition } from "react";
import { Tabs } from "radix-ui";
import { takeLoan } from "./actions";
import { isLoanAmount, loanRoom } from "@/lib/magnum-opus";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/v2/components/ui/dialog";

type Step = "intro" | "amount" | "warning" | "done";

const TAB =
  "-mb-px border-b-2 border-transparent pb-2 font-grotesk text-sm font-bold text-cream/55 outline-none hover:text-cream focus-visible:text-cream data-[state=active]:border-salmon data-[state=active]:text-cream sm:text-base";

function Placeholder({ children }: { children: string }) {
  return (
    <div
      role="img"
      aria-label={children}
      className="flex aspect-[4/3] w-full max-w-[280px] items-center justify-center rounded-lg border-2 border-dashed border-cream/40 p-4 text-center font-space-mono text-xs tracking-wide text-cream/60 uppercase"
    >
      {children}
    </div>
  );
}

const or = new Intl.ListFormat("en-US", { type: "disjunction" });

export default function GetTokensDialog({
  volunteers,
  ticketed,
  loanTokens,
  cap,
  lending,
}: {
  volunteers: string[];
  /** Holds a claimed ticket; loans are for ticket holders only. */
  ticketed: boolean;
  loanTokens: number;
  /** loanCap for this account: 5 plus its Megagame levels. */
  cap: number;
  /** Loans are open (the schedule or the backstage override). */
  lending: boolean;
}) {
  const room = loanRoom(loanTokens, cap);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [entry, setEntry] = useState("1");
  const amount = Number(entry);
  const valid = isLoanAmount(amount, loanTokens, cap);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setStep("intro");
      setEntry("1");
      setError(null);
    }
  };

  const consent = () => {
    setError(null);
    start(async () => {
      const result = await takeLoan(amount);
      if (result.error) setError(result.error);
      else setStep("done");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="w-fit">
          Get tokens
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-w-[520px] flex-col gap-5 px-5 py-6 sm:px-8 sm:py-7">
        <DialogTitle className="font-bebas text-2xl tracking-wide text-cream">
          Get tokens
        </DialogTitle>
        <Tabs.Root defaultValue="earn" className="flex flex-col gap-5">
          <Tabs.List
            aria-label="Get tokens"
            className="flex gap-5 border-b border-cream/15"
          >
            <Tabs.Trigger value="earn" className={TAB}>
              Earn tokens
            </Tabs.Trigger>
            <Tabs.Trigger value="convert" className={TAB}>
              Convert tokens
            </Tabs.Trigger>
            <Tabs.Trigger value="credit" className={TAB}>
              Credit
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content
            value="earn"
            className="flex flex-col gap-4 outline-none"
          >
            <p className="leading-relaxed">
              To earn tokens, participate in sessions, explore campus, and be a
              good member of team human. Tokens look like this:
            </p>
            <Placeholder>Placeholder: a picture of a token</Placeholder>
          </Tabs.Content>

          <Tabs.Content value="convert" className="outline-none">
            <p className="leading-relaxed">
              To spend your tokens, you must first upload them. To do this, find{" "}
              {volunteers.length > 0 ? (
                <strong className="text-salmon">{or.format(volunteers)}</strong>
              ) : (
                "a Magnum Opus volunteer"
              )}
              , hand them your tokens, and tell them who you are.
            </p>
          </Tabs.Content>

          <Tabs.Content
            value="credit"
            className="flex flex-col gap-4 outline-none"
          >
            {step === "intro" && (
              <>
                <p className="leading-relaxed">
                  Can&rsquo;t find a volunteer? Accidentally turned on max
                  effort? Gambled on that usage reset that never came? Metagame
                  offers affordable loans for those who have hit upon hard
                  times.
                </p>
                {!lending ? (
                  <p className="text-sm text-cream/70">
                    Metagame is no longer offering loans.
                  </p>
                ) : !ticketed ? (
                  <p className="text-sm text-cream/70">
                    Loans are only available to ticket holders.
                  </p>
                ) : room === 0 ? (
                  <p className="text-sm text-cream/70">
                    You owe {loanTokens}, and your loan limit is {cap}. Pay some
                    back before borrowing more.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep("amount")}
                    className="w-fit font-semibold text-salmon underline underline-offset-4 hover:text-cream"
                  >
                    Click here to proceed.
                  </button>
                )}
              </>
            )}

            {step === "amount" && (
              <>
                <form
                  id="loan-amount-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (valid) setStep("warning");
                  }}
                  className="flex flex-col gap-2"
                >
                  <label htmlFor="loan-amount" className="leading-relaxed">
                    How many tokens would you like to borrow?
                  </label>
                  <input
                    id="loan-amount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={room}
                    step={1}
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    aria-invalid={!valid}
                    aria-describedby="loan-amount-hint"
                    autoFocus
                    className="w-32 rounded-lg border-[1.5px] border-cream/30 bg-transparent px-3 py-2 font-grotesk text-lg font-bold text-cream tabular-nums outline-none focus:border-salmon aria-invalid:border-salmon"
                  />
                </form>
                <p id="loan-amount-hint" className="text-sm text-cream/70">
                  {entry !== "" && !valid && (
                    <span className="block text-salmon">
                      Enter a whole number from 1 to {room}.
                    </span>
                  )}
                  Your loan limit is {cap}.
                  {loanTokens > 0 &&
                    ` You owe ${loanTokens}, so you can borrow up to ${room} more.`}
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("intro")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    form="loan-amount-form"
                    size="sm"
                    disabled={!valid}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}

            {step === "warning" && (
              <>
                <Placeholder>
                  Placeholder: a threatening image of Brian holding a water gun
                </Placeholder>
                <p className="leading-relaxed">
                  <strong className="text-salmon">WARNING:</strong> Metagame
                  will use all available measures to enforce their property
                  rights. All loans are due within 4 sunlight hours, or the end
                  of Metagame, whichever is sooner. Anyone in arrears is subject
                  to immediate penalties up to and including liquidation.
                </p>
                {error && <p className="text-sm text-salmon">{error}</p>}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setStep("amount")}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={consent}
                    className="whitespace-normal"
                  >
                    {pending
                      ? "Borrowing…"
                      : "I agree to these terms and consent to the risks"}
                  </Button>
                </div>
              </>
            )}

            {step === "done" && (
              <p className="leading-relaxed">
                {amount} token{amount === 1 ? " has" : "s have"} been added to
                your account. The clock is ticking.
              </p>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </DialogContent>
    </Dialog>
  );
}
