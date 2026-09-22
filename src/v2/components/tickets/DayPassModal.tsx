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
        <div className="flex flex-col gap-3">
          {dayPasses.map((pass) => {
            const href = dayPassUrl(pass);
            if (!href) return null;
            return (
              <Button
                key={pass.id}
                asChild
                variant="raised"
                className="h-auto justify-between px-5 py-3"
              >
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <span className="font-space-mono text-[13px] tracking-[0.12em] text-cream/85 uppercase">
                    {pass.date.long.replace(/, 2026$/, "")}
                  </span>
                  <span
                    className={`${HEADING} text-[24px] leading-none text-tan`}
                  >
                    ${pass.usd}
                  </span>
                </a>
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-cream/55">
          Day passes are sold in USD via Stripe only.
        </p>
      </DialogContent>
    </Dialog>
  );
}
