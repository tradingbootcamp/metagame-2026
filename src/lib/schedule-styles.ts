// Category colors for the last-year schedule on the 2026 cream background.
// Blocks keep dark-purple text. Hues sit on the blue↔orange axis and step in
// lightness so every pair stays distinct under red-green colorblindness;
// keep min ΔE ≳ 12 in protan/deutan simulation when retuning.
import type { CSSProperties } from "react";
import type { Category, Session } from "@/lib/last-year-schedule";

interface Swatch {
  background: string;
  borderColor: string;
}

export const CATEGORY_STYLES: Record<Category, Swatch> = {
  talk: { background: "#9dc6f3", borderColor: "#2f7fd9" },
  workshop: { background: "#f4b26b", borderColor: "#d46a12" },
  game: { background: "#f4c3d6", borderColor: "#d16c98" },
  other: { background: "#c6cdad", borderColor: "#848e6c" },
};

const KIDS_STYLE: Swatch = { background: "#fce985", borderColor: "#d8ba1a" };

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
