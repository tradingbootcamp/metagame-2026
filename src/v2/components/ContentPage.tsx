import { EYEBROW, HEADING } from "./styles";

// Shell for the non-home pages (/sponsor, /team, …): clears the fixed
// corner nav, sets the measure, and gives every page the same title block.
export default function ContentPage({
  eyebrow,
  title,
  intro,
  children,
  wide = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto px-8 pt-28 pb-20 ${wide ? "max-w-[1600px]" : "max-w-[1180px]"}`}
    >
      <header className="mb-10 max-w-[820px]">
        {eyebrow && <p className={`${EYEBROW} mb-2 text-meeple`}>{eyebrow}</p>}
        <h1 className={`${HEADING} text-[clamp(34px,5vw,56px)] text-navy`}>
          {title}
        </h1>
        {intro && (
          <div className="mt-4 text-base text-ink/70 md:text-lg">{intro}</div>
        )}
      </header>
      {children}
    </div>
  );
}
