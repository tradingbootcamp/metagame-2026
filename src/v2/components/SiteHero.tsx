import Link from "next/link";
import { Button } from "@/v2/components/ui/button";
import Dice from "./dice/Dice";
import HeroBackdrop from "./HeroBackdrop";

// The above-the-fold banner: exactly one viewport tall, so the photo ends
// where the next section starts. The library photo (washed) sits behind the
// rolling-dice METAGAME wordmark, then the tagline, date and tickets CTA on
// a cream card so they read against the photo. Content hangs from the top
// (pt-[12vh]) rather than centring, so HeroBackdrop can place its wash on the
// dice with a fixed formula. `isolate` keeps the backdrop's -z-10 inside this
// section's stacking context: behind the dice, above the cream.
export default function SiteHero() {
  return (
    <section className="relative isolate flex min-h-[88svh] flex-col items-center px-8 pt-[12vh] pb-8 text-center">
      <HeroBackdrop />
      <Dice />
      <div className="mt-4 flex w-[85vw] max-w-[52ch] flex-col items-center rounded-lg border border-navy/10 bg-cream/70 px-5 py-4 shadow-[0_8px_24px_rgba(23,48,89,0.12)] md:mt-10 md:w-auto md:px-7 md:py-5">
        {/* Always two deliberate lines: the joined one-liner is wider than
            this card ever gets, so it would overflow or wrap raggedly. */}
        <p className="font-space-mono text-lg tracking-[0.04em] text-meeple uppercase [word-spacing:-0.45em] md:text-xl md:tracking-[0.12em] md:[word-spacing:0]">
          <span className="whitespace-nowrap">Nov 6-8, 2026</span>
          <br />
          <span className="whitespace-nowrap">Lighthaven, Berkeley, CA</span>
        </p>
        <Button
          asChild
          variant="raised"
          size="lg"
          className="mt-4 h-auto px-6 py-2.5 text-lg md:mt-5 md:px-7 md:py-3 md:text-xl"
        >
          <Link href="/#tickets">Get Tickets</Link>
        </Button>
        <p className="mt-3 font-grotesk text-base text-navy italic md:mt-4 md:text-xl">
          I never met a game I didn&apos;t like
        </p>
      </div>
    </section>
  );
}
