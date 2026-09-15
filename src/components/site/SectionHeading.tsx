import { EYEBROW, HEADING } from "./styles";

// The shared two-part section header — a meeple eyebrow question over the section
// title — so every section on the one-pager reads with the same rhythm.
export default function SectionHeading({
  eyebrow,
  title,
  className = "",
}: {
  eyebrow: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={`${EYEBROW} mb-2.5 text-meeple`}>{eyebrow}</p>
      <h2 className={`${HEADING} text-[clamp(28px,4vw,40px)] text-navy`}>
        {title}
      </h2>
    </div>
  );
}
