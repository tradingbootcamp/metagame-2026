import { Button } from "@/v2/components/ui/button";
import { EGG_TIER_2027 } from "@/lib/tickets";
import { HEADING } from "../styles";

export const EGG_TIER_HREF = EGG_TIER_2027.link;

// Mixed-case so the bold phrase reads; "until 11/15" is the brand red.
export function EarlierBirdNote({ className = "" }: { className?: string }) {
  return (
    <p className={`font-space-mono tracking-[0.02em] text-navy ${className}`}>
      Limited time: earlier-than-early-bird
      <br />
      <strong className="font-grotesk text-[1.6em] leading-[1.15] font-bold tracking-[-0.01em]">
        Egg Tier tickets available
      </strong>
      <br />
      <span className="font-bold text-meeple">until 11/15</span>
    </p>
  );
}

// Single ticket tile for Metagame 2027: mono uppercase label over a big
// grotesk minimum price, on the raised Button variant, linking straight to
// the Stripe payment link where the buyer picks the amount.
export default function EggTierTicket() {
  return (
    <Button
      asChild
      variant="raised"
      className="min-h-[112px] min-w-[210px] flex-col gap-1 px-7 py-4"
    >
      <a href={EGG_TIER_HREF} target="_blank" rel="noopener noreferrer">
        <span className="font-space-mono text-[13px] tracking-[0.18em] whitespace-nowrap text-cream/85 uppercase">
          Metagame 2027
        </span>
        <span className="flex items-baseline gap-2.5 leading-none">
          <span className="font-space-mono text-[13px] tracking-[0.18em] text-cream/85 uppercase">
            Egg Tier
          </span>
          <span className={`${HEADING} text-[30px] text-tan`}>
            - ${EGG_TIER_2027.minUsd}+
          </span>
        </span>
      </a>
    </Button>
  );
}
