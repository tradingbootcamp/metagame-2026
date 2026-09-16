import { cn } from "@/v2/lib/utils";
import { EYEBROW, HEADING } from "./styles";

// The shared two-part section header — a meeple eyebrow question over the section
// title — so every section on the one-pager reads with the same rhythm.
export default function SectionHeading({
  eyebrow,
  title,
  align = "left",
  className = "",
  eyebrowClassName,
}: {
  eyebrow: string;
  title: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  eyebrowClassName?: string;
}) {
  return (
    <div
      className={`${align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      <p className={cn(EYEBROW, "mb-2.5 text-meeple", eyebrowClassName)}>
        {eyebrow}
      </p>
      <h2 className={`${HEADING} text-[clamp(28px,4vw,40px)] text-navy`}>
        {title}
      </h2>
    </div>
  );
}
