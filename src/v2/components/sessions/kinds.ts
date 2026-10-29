import {
  Crown,
  Dices,
  Drama,
  FlaskConical,
  Footprints,
  Mic,
  Puzzle,
  Shapes,
  Sparkles,
  Swords,
  VenetianMask,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type {
  Session2026,
  SessionKind,
  SessionStatus,
} from "@/v2/data/sessions-2026";

// How each kind of session reads on its card: label, icon and band colour.
export const KINDS: Record<
  SessionKind,
  { label: string; Icon: LucideIcon; band: string }
> = {
  larp: { label: "LARP", Icon: Drama, band: "bg-peach" },
  talk: { label: "Talk", Icon: Mic, band: "bg-sky" },
  workshop: { label: "Workshop", Icon: Wrench, band: "bg-tan" },
  game: { label: "Game", Icon: Dices, band: "bg-moss/45" },
  ttrpg: { label: "TTRPG", Icon: Swords, band: "bg-peach" },
  deception: { label: "Social deception", Icon: VenetianMask, band: "bg-sky" },
  puzzle: { label: "Puzzle", Icon: Puzzle, band: "bg-tan" },
  immersive: { label: "Immersive", Icon: Sparkles, band: "bg-peach" },
  megagame: { label: "Megagame", Icon: Crown, band: "bg-tan" },
  physical: { label: "Physical", Icon: Footprints, band: "bg-moss/45" },
  playtest: { label: "Playtest", Icon: FlaskConical, band: "bg-sky" },
  other: { label: "Something else", Icon: Shapes, band: "bg-background" },
};

// What each status means, in the site's words, and its tag's colours.
export const STATUS: Record<
  SessionStatus,
  { label: string; line: string; chip: string }
> = {
  confirmed: {
    label: "Confirmed",
    line: "Confirmed: on the program.",
    chip: "bg-cream text-navy",
  },
  review: {
    label: "In review",
    line: "In review: submitted, not confirmed yet.",
    chip: "border border-dashed border-navy/50 text-navy/75",
  },
  unconference: {
    label: "Unconference",
    line: "Unconference: on the unconference schedule, not the main program.",
    chip: "bg-sky text-navy",
  },
};

export const hostLine = (s: Session2026) =>
  s.hosts.join(", ") + (s.org ? ` · ${s.org}` : "");

// Rule one: if it's designed to be played, it counts. Talks and workshops
// are about games; everything else on the program is one.
const PLAYED = new Set<SessionKind>([
  "larp",
  "game",
  "ttrpg",
  "deception",
  "puzzle",
  "immersive",
  "megagame",
  "physical",
  "playtest",
]);
export const isPlayed = (s: Session2026) => s.kinds.some((k) => PLAYED.has(k));
