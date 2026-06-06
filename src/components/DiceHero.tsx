import Dice from "./Dice";
import SignupForm from "./SignupForm";

// film-grain texture (data-URI kept out of the className for legibility)
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23g)' opacity='0.35'/%3E%3C/svg%3E\")";

export default function DiceHero() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center overflow-hidden bg-[#687ee2] px-[clamp(20px,5vw,56px)] py-[clamp(24px,4vh,48px)] font-[family-name:var(--font-space-grotesk)] text-[#1b1530]">
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

        <div className="flex items-center gap-[clamp(10px,2.5vw,22px)] text-center font-[family-name:var(--font-bebas)] text-[clamp(38px,9vw,68px)] leading-[0.85] tracking-[0.02em]">
          <span>Nov 6&ndash;8, 2026</span>
          <span className="text-[0.5em] text-[#eaa35a]">&middot;</span>
          <span>Berkeley, CA</span>
        </div>

        <div className="relative z-[5] flex w-full max-w-[440px] flex-col items-center gap-[14px]">
          <p className="m-0 text-center font-[family-name:var(--font-bebas)] text-[clamp(26px,6vw,38px)] leading-tight tracking-[0.05em]">
            Get notified
            <br />
            <span className="block text-center font-sans text-[clamp(15px,3.6vw,22px)] leading-[1.2] font-normal tracking-normal not-italic">
              About ticket sales, updates, volunteer opportunities, and more
            </span>
          </p>
          <SignupForm />
          <span className="text-center text-base text-[#1b1530]">
            Questions? Interested in speaking/participating/sponsoring? Email us
            at <a href="mailto:team@metagame.games">team@metagame.games</a>
          </span>
          <a
            className="mt-1 border-b-[1.5px] border-transparent pb-px text-[13px] tracking-[0.16em] text-[#1b1530]/70 uppercase transition hover:border-[#eaa35a] hover:text-[#1b1530]"
            href="https://2025.metagame.games"
            target="_blank"
            rel="noopener noreferrer"
          >
            Revisit 2025 <span className="text-[#2b9bf0]">↗</span>
          </a>
        </div>
      </div>

      <div aria-hidden className="flex-[1]" />

      <footer className="pointer-events-none absolute right-4 bottom-3 z-[70] text-[11px] tracking-wider text-[#1b1530]/40">
        © Metagame LLC 2026
      </footer>
    </main>
  );
}
