import type { PermissionLevel } from "@/lib/permissions";

const STYLE: Record<PermissionLevel, string> = {
  view: "bg-moss/15 text-moss",
  edit: "bg-amber-100 text-amber-800",
  delete: "bg-meeple/10 text-meeple",
};

/** Display only: how much a permission lets its holder change. */
export function LevelBadge({
  level,
  className = "",
}: {
  level: PermissionLevel;
  className?: string;
}) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-wide uppercase ${STYLE[level]} ${className}`}
    >
      {level}
    </span>
  );
}
