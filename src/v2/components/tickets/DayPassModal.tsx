"use client";

import { dayPasses, dayPassUrl } from "@/v2/lib/tickets";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import { HEADING } from "../styles";

// Single-day admission: one Stripe Payment Link per day, USD only (no BTC rail).
export default function DayPassModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-w-[460px] flex-col gap-5 p-6 sm:p-8">
        <div className="flex flex-col gap-1 pr-6">
          <DialogTitle className={`${HEADING} text-[clamp(24px,6vw,30px)]`}>
            Day Passes
          </DialogTitle>
          <DialogDescription className="text-base text-cream/80">
            Admission for a single day of Metagame 2026.
          </DialogDescription>
        </div>
        <div className="grid grid-cols-3 gap-3 max-[420px]:grid-cols-1">
          {dayPasses.map((pass) => {
            const href = dayPassUrl(pass);
            if (!href) return null;
            const [weekday, monthDay] = pass.date.long.split(", ");
            return (
              <Button
                key={pass.id}
                asChild
                variant="raised"
                className="h-auto flex-col gap-1 px-3 py-4"
              >
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <span className="font-space-mono text-[13px] tracking-[0.18em] text-cream/85 uppercase">
                    {weekday}
                  </span>
                  <span
                    className={`${HEADING} text-[26px] leading-none text-tan`}
                  >
                    ${pass.usd}
                  </span>
                  <span className="font-space-mono text-[11px] tracking-[0.08em] text-cream/60 uppercase">
                    {monthDay}
                  </span>
                </a>
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-cream/55">
          You will be taken to secure Stripe checkout.
        </p>
      </DialogContent>
    </Dialog>
  );
}
