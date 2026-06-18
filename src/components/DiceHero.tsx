import Dice from "./Dice";
import SignupForm from "./SignupForm";
import { ticketTiers, ticketUrl } from "@/lib/tickets";
import { FaEnvelope, FaExternalLinkAlt } from "react-icons/fa";
// film-grain texture (data-URI kept out of the className for legibility)
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23g)' opacity='0.35'/%3E%3C/svg%3E\")";

export default function DiceHero() {
  const earlyBird = ticketTiers.find((t) => t.id === "early-bird");
  // null until a Payment Link is configured for the active Stripe mode → CTA stays hidden.
  const ticketHref = earlyBird ? ticketUrl(earlyBird) : null;

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center overflow-hidden bg-[#fff5e4] px-[clamp(20px,5vw,56px)] py-[clamp(24px,4vh,48px)] font-[family-name:var(--font-space-grotesk)] text-[#1b1530]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[60] opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <h1 className="sr-only">Metagame 2026</h1>

      {/* top spacer larger than bottom → dice land at the optical center */}
      <div aria-hidden className="flex-[3]" />

      <div className="flex flex-col items-center gap-[clamp(28px,5vh,56px)]">
        <Dice />
        <div aria-hidden className="hidden flex-[3] sm:block" />

        <div className="flex flex-col items-center gap-2">
          <span className="text-center text-lg text-[#1b1530]">
            A conference for game design, strategy, narrative, and play.
          </span>
          <a
            className="flex items-center justify-center gap-2 border-b-[1.5px] border-transparent pb-px text-[13px] tracking-[0.16em] text-[#1b1530]/70 uppercase transition hover:border-[#eaa35a] hover:text-[#1b1530]"
            href="https://2025.metagame.games/#speakers"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>See last year&rsquo;s lineup</span>
            <span>
              <FaExternalLinkAlt size={12} />
            </span>
          </a>
        </div>
        {/* mobile: pull date/location tighter to its neighbors; full gap returns at sm */}
        <div className="-my-4 flex items-center gap-[clamp(10px,2.5vw,22px)] text-center font-[family-name:var(--font-bebas)] text-[clamp(38px,9vw,68px)] leading-[0.85] tracking-[0.02em] sm:my-0">
          <span>Nov 6&ndash;8, 2026</span>
          <span className="text-[0.5em] text-[#eaa35a]">&middot;</span>
          <span>Berkeley, CA</span>
        </div>

        {earlyBird && ticketHref && (
          <a
            href={ticketHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative z-[5] w-full max-w-[440px]"
          >
            {/* orange box behind the button, revealed on hover (set apart from the blue Notify-me CTA) */}
            <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
            <span className="relative flex min-h-14 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#1b1530] px-7 py-2 font-[family-name:var(--font-bebas)] leading-none tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
              <span className="flex items-center gap-2 text-[22px]">
                <span>Early-Bird Tickets</span>
                {/* "now on sale" badge */}
                <span className="bg-[#eaa35a] px-2 py-[2px] text-[15px] tracking-[0.18em] text-[#1b1530]">
                  LIVE
                </span>
              </span>
              <span className="flex items-center gap-2 text-[28px]">
                {/* full price struck through, early-bird price in the accent orange */}
                <span className="text-[#f4ecd2]/45 line-through">
                  ${earlyBird.fullPrice}
                </span>
                <span className="text-[#eaa35a]">
                  ${earlyBird.earlyBirdPrice}
                </span>
              </span>
            </span>
          </a>
        )}

        <div className="relative z-[5] flex w-full max-w-[440px] flex-col items-center gap-[8px] sm:gap-[14px]">
          <p className="m-0 text-center font-[family-name:var(--font-bebas)] text-[clamp(26px,6vw,38px)] leading-tight tracking-[0.05em]">
            Get notified
            <br />
            <span className="block text-center font-sans text-[clamp(15px,3.6vw,22px)] leading-[1.2] font-normal tracking-normal not-italic">
              About ticket sales, updates, volunteer opportunities, and more
            </span>
          </p>
          <SignupForm />
          <span className="text-center text-sm text-[#1b1530]">
            Questions?
            <a
              href="mailto:team@metagame.games"
              className="ml-2 inline-flex items-center gap-1 underline"
            >
              <FaEnvelope size={12} aria-hidden className="translate-y-[1px]" />
              team@metagame.games
            </a>
          </span>
        </div>
      </div>

      <div aria-hidden className="flex-[1]" />

      <footer className="pointer-events-none absolute right-4 bottom-3 z-[70] text-[11px] tracking-wider text-[#1b1530]/40">
        © Metagame LLC 2026
      </footer>
    </main>
  );
}
