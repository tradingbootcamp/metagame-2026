// Category colors for the last-year schedule, re-tuned from the 2025 site's
// pastels to sit on the 2026 cream background. Blocks keep dark-purple text.
import type { CSSProperties } from "react";
import type { Category, Session } from "@/lib/last-year-schedule";

interface Swatch {
  background: string;
  borderColor: string;
}

export const CATEGORY_STYLES: Record<Category, Swatch> = {
  talk: { background: "#cfe3f7", borderColor: "#8bbce6" },
  workshop: { background: "#f6dcc0", borderColor: "#e0a869" },
  game: { background: "#d3e8cd", borderColor: "#8bbd83" },
  other: { background: "#e7ddc6", borderColor: "#c8bc9b" },
};

const KIDS_STYLE: Swatch = { background: "#f6ecbd", borderColor: "#dcc555" };

// Megagames run continuously — the striped fill echoes the 2025 site, recolored
// to the 2026 orange + a soft violet.
const MEGAGAME_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg,#eaa35a,#eaa35a 9px,#cbb6ec 9px,#cbb6ec 18px)",
  borderColor: "transparent",
};

/** Precedence matches the 2025 site: megagame → kids → category → other. */
export function sessionStyle(session: Session): CSSProperties {
  if (session.megagame) return MEGAGAME_STYLE;
  if (session.ages === "KIDS") return KIDS_STYLE;
  if (session.category) return CATEGORY_STYLES[session.category];
  return CATEGORY_STYLES.other;
}

export interface LegendEntry {
  label: string;
  style: CSSProperties;
}

export const LEGEND: LegendEntry[] = [
  { label: "Talk", style: CATEGORY_STYLES.talk },
  { label: "Workshop", style: CATEGORY_STYLES.workshop },
  { label: "Game", style: CATEGORY_STYLES.game },
  { label: "Other", style: CATEGORY_STYLES.other },
  { label: "Kid-friendly", style: KIDS_STYLE },
  { label: "Megagame", style: MEGAGAME_STYLE },
];
