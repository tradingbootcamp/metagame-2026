import type { ComponentType } from "react";
import {
  CalendarDays,
  Mail,
  MessageCircleQuestion,
  MessageSquareQuote,
  Puzzle,
  Ticket,
  UserRound,
} from "lucide-react";
import { TESTIMONIALS } from "@/data/testimonials";
import Mg2Die from "./Mg2Die";
import RubberDuck from "./RubberDuck";

// Single source of truth shared by the one-pager sections and the nav, so
// their ids/labels/icons can never drift. Section wrappers use `id`; the rail
// uses `id` for scroll-spy + smooth-scroll and `label` on hover.
type IconProps = { size?: number; strokeWidth?: number; className?: string };
export type Section = {
  id: string;
  label: string;
  icon: ComponentType<IconProps>;
};

// Home uses the custom MG2 die; the rest are lucide placeholders to refine.
const ALL_SECTIONS: readonly Section[] = [
  { id: "home", label: "Home", icon: Mg2Die },
  { id: "about", label: "About", icon: Puzzle },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "speakers", label: "Speakers", icon: UserRound },
  { id: "children", label: "Children", icon: RubberDuck },
  { id: "mailing-list", label: "Mailing List", icon: Mail },
  { id: "testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "faq", label: "FAQ", icon: MessageCircleQuestion },
] as const;

// Testimonials renders only when it has quotes, so the rail has to drop in step
// with it — otherwise the entry scrolls to an id that isn't on the page.
export const SECTIONS: readonly Section[] = ALL_SECTIONS.filter(
  (s) => s.id !== "testimonials" || TESTIMONIALS.length > 0,
);
