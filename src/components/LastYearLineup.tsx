import LastYearSchedule from "./LastYearSchedule";

// Home-page section: last year's program, one day at a time (a day switcher, same
// as the standalone /last-year page). Inherits the page background + grain so it
// reads as one continuous flow with the hero.
export default function LastYearLineup() {
  return (
    <section className="relative px-[clamp(20px,5vw,56px)] py-[clamp(40px,7vh,80px)]">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-[clamp(34px,8vw,64px)] leading-[0.9] tracking-[0.02em]">
            Last year&rsquo;s lineup
          </h2>
          <p className="max-w-[640px] text-lg text-[#1b1530]/80">
            The full program from Metagame 2025 &mdash; talks, workshops, games,
            and components of the ongoing Megagame across three days &mdash; as
            a preview of what to expect in 2026.
          </p>
        </header>

        <div className="w-full">
          <LastYearSchedule variant="tabbed" />
        </div>
      </div>
    </section>
  );
}
