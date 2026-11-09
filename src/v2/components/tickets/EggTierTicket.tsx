import { Button } from "@/v2/components/ui/button";
import { HEADING } from "../styles";

export const EGG_TIER_HREF = "https://buy.stripe.com/fZubJ0gUTgnJfRh9Vgfw40i";

export const EARLIER_BIRD_NOTE =
  "Limited time: earlier-than-early-bird tickets available until 11/15";

// Single ticket tile for Metagame 2027: mono uppercase label over a big
// grotesk price, on the raised Button variant, linking straight to the
// Stripe payment link.
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
          <span className={`${HEADING} text-[30px] text-tan`}>- $150</span>
        </span>
      </a>
    </Button>
  );
}
