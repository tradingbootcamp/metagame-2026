import { FaArrowRight } from "react-icons/fa";
import { RFP_FORM_URL } from "@/lib/links";

// Home-page section: call for session proposals. Inherits the page background +
// grain so it reads as one continuous flow with the hero and the lineup.
export default function ProposeSession() {
  return (
    <section className="relative px-[clamp(20px,5vw,56px)] py-[clamp(40px,7vh,80px)]">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-5 text-center">
        <h2 className="font-[family-name:var(--font-bebas)] text-[clamp(34px,8vw,64px)] leading-[0.9] tracking-[0.02em]">
          Run a session
        </h2>
        <p className="max-w-[560px] text-lg text-[#1b1530]/80">
          Metagame is made by the people who show up. Got a talk, a workshop, a
          game, or something that defies category? We&rsquo;re accepting session
          proposals for 2026.
        </p>

        {/* signature button: dark front slides to reveal the orange box on hover */}
        <a
          href={RFP_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-block"
        >
          <span aria-hidden className="absolute inset-0 bg-[#eaa35a]" />
          <span className="relative flex min-h-14 items-center justify-center gap-2 bg-[#1b1530] px-8 py-2 font-[family-name:var(--font-bebas)] text-[22px] tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px]">
            Propose a session
            <FaArrowRight size={16} aria-hidden />
          </span>
        </a>
      </div>
    </section>
  );
}
