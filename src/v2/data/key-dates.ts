import { EARLY_BIRD_ENDS_AT } from "@/lib/early-bird";
import {
  CHILD_REGISTRATION_FORM_URL,
  FINANCIAL_AID_FORM_URL,
  RFP_FORM_URL,
  VOLUNTEER_FORM_URL,
} from "@/v2/lib/links";

export type KeyDate = {
  /** Short label as shown on the timeline, e.g. "Oct 5". */
  label: string;
  title: string;
  /** Epoch ms after which the entry reads as past (end of that day, Pacific). */
  endsAt: number;
  href?: string;
  cta?: string;
  /** The con itself: drawn larger than a deadline. */
  milestone?: boolean;
  /** A joke, not a deadline: set quieter. */
  aside?: boolean;
};

// Date.now() stays behind these helpers (like isEarlyBirdActive) so components
// don't call it in render, which the React purity lint rejects.

/** Dates still to come, in order; the timeline starts from today. */
export function upcomingKeyDates(now = Date.now()): KeyDate[] {
  return KEY_DATES.filter((d) => now < d.endsAt);
}

/** Today's date in Lighthaven's time zone, e.g. "Sep 15". */
export function todayLabel(now = Date.now()): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(now);
}

// Midnight Pacific after the given 2026 day. DST ends Nov 1, 2026, so October
// days end at 07:00 UTC and November days at 08:00.
const endOfDay = (month: number, day: number) =>
  Date.UTC(2026, month - 1, day + 1, month >= 11 ? 8 : 7);

// Same dates as the announcement email's "Key dates" section; keep in sync.
export const KEY_DATES: KeyDate[] = [
  {
    label: "Sep 30",
    title: "Early-bird ticket pricing ends",
    endsAt: EARLY_BIRD_ENDS_AT,
    href: "/#tickets",
    cta: "Get tickets",
  },
  {
    label: "Oct 5",
    title: "Session proposals due",
    endsAt: endOfDay(10, 5),
    href: RFP_FORM_URL,
    cta: "Submit a proposal",
  },
  {
    label: "Oct 10",
    title: "Megagame proposals due",
    endsAt: endOfDay(10, 10),
    href: RFP_FORM_URL,
    cta: "Submit a proposal",
  },
  {
    label: "Oct 15",
    title: "Childcare registration due",
    endsAt: endOfDay(10, 15),
    href: CHILD_REGISTRATION_FORM_URL,
    cta: "Register a child",
  },
  {
    label: "Oct 19",
    title: "Financial aid applications due",
    endsAt: endOfDay(10, 19),
    href: FINANCIAL_AID_FORM_URL,
    cta: "Apply for aid",
  },
  {
    label: "Oct 26",
    title: "Volunteer applications due",
    endsAt: endOfDay(10, 26),
    href: VOLUNTEER_FORM_URL,
    cta: "Apply to volunteer",
  },
  {
    label: "Oct 29",
    title: "Ticket sales close",
    endsAt: endOfDay(10, 29),
    href: "/#tickets",
    cta: "Get tickets",
  },
  {
    label: "Nov 6–8",
    title: "Metagame 2026!",
    endsAt: endOfDay(11, 8),
    milestone: true,
  },
  {
    label: "Nov 9",
    title: "The Metagame team takes a looong nap",
    endsAt: endOfDay(11, 9),
    aside: true,
  },
];
