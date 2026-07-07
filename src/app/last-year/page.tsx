import type { Metadata } from "next";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import LastYearSchedule from "@/components/LastYearSchedule";

export const metadata: Metadata = {
  title: "Last year's schedule — Metagame 2026",
  description:
    "The full Metagame 2025 schedule — 140+ talks, workshops, games, and megagames across three days. A preview of the kind of programming to expect at Metagame 2026.",
};

// film-grain texture, matching the splash page
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23g)' opacity='0.35'/%3E%3C/svg%3E\")";

export default function LastYearPage() {
  return (
    <main className="relative min-h-dvh flex-1 bg-[#fff5e4] px-[clamp(16px,4vw,56px)] py-[clamp(24px,4vh,48px)] font-[family-name:var(--font-space-grotesk)] text-[#1b1530]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="flex w-fit items-center gap-2 text-[13px] tracking-[0.16em] text-[#1b1530]/70 uppercase transition hover:text-[#1b1530]"
          >
            <FaArrowLeft size={12} />
            <span>Back to Metagame 2026</span>
          </Link>

          <h1 className="font-[family-name:var(--font-bebas)] text-[clamp(40px,10vw,84px)] leading-[0.9] tracking-[0.02em]">
            Last year&rsquo;s schedule
          </h1>
          <p className="max-w-[640px] text-lg text-[#1b1530]/80">
            The complete program from Metagame 2025 &mdash; talks, workshops,
            games, and megagames across three days in Berkeley. It&rsquo;s a
            preview of the kind of programming to expect at Metagame 2026. Tap
            any session for details.
          </p>
        </header>

        <LastYearSchedule />
      </div>
    </main>
  );
}
