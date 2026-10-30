import {
  CalendarIcon,
  DatabaseIcon,
  DicesIcon,
  DollarSignIcon,
  KeyIcon,
  LinkIcon,
  type LucideIcon,
  MailIcon,
  MicIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import SignIn from "../SignIn";
import { Card } from "../ui";
import { teamAccess } from "@/lib/access";
import { toolAccess } from "@/lib/admin-auth";
import type { Permission } from "@/lib/permissions";

// `perm`: holding any one of them lists the tool.
const TOOLS: {
  href: string;
  name: string;
  blurb: string;
  icon: LucideIcon;
  perm: Permission | Permission[];
}[] = [
  {
    href: "/backstage/links",
    icon: LinkIcon,
    name: "Tracking links",
    blurb: "Short /go/ links with UTM attribution.",
    perm: "links.manage",
  },
  {
    href: "/backstage/emails",
    icon: MailIcon,
    name: "Sent emails",
    blurb: "The announcements and other emails we've sent, to read back.",
    perm: "emails.view",
  },
  {
    href: "/backstage/promo",
    icon: DollarSignIcon,
    name: "Promo codes",
    blurb: "Mint comp and discount codes on Stripe or BTC.",
    perm: "promo.manage",
  },
  {
    href: "/backstage/users",
    icon: UserIcon,
    name: "Users",
    blurb: "Accounts, their roles and permissions.",
    perm: "users.view",
  },
  {
    href: "/backstage/roles",
    icon: UsersIcon,
    name: "Roles",
    blurb: "Bundles of permissions to hand out, like Volunteer.",
    perm: "roles.manage",
  },
  {
    href: "/backstage/tickets",
    icon: TicketIcon,
    name: "Tickets",
    blurb: "Every ticket with its buyer, holder and attendee.",
    perm: "tickets.view",
  },
  {
    href: "/backstage/schedule",
    icon: CalendarIcon,
    name: "Schedule",
    blurb: "Rooms and sessions for the 2026 program, on a day-by-room grid.",
    perm: "schedule.manage",
  },
  {
    href: "/backstage/speaker-committee",
    icon: MicIcon,
    name: "Speaker committee",
    blurb: "Session proposals from grading through scheduling.",
    perm: "schedule.manage",
  },
  {
    href: "/backstage/budget",
    icon: WalletIcon,
    name: "Budget",
    blurb: "New Xero lines, categorized for review into the budget sheet.",
    perm: "budget.view",
  },
  {
    href: "/backstage/api-keys",
    icon: KeyIcon,
    name: "API keys",
    blurb:
      "Keys for scripts and Claude sessions to act as an account over HTTP.",
    perm: ["api_keys.self", "api_keys.manage"],
  },
  {
    href: "/backstage/schema",
    icon: DatabaseIcon,
    name: "Database schema",
    blurb: "ER diagram and column-by-column reference for the Postgres schema.",
    perm: "schema.view",
  },
  {
    href: "/backstage/dice-lab",
    icon: DicesIcon,
    name: "Dice lab",
    blurb:
      "Arrange the hero dice and export transparent PNG or SVG assets for print.",
    perm: "misc.dice_lab",
  },
];

export default async function AdminIndexPage() {
  await connection();

  const access = await toolAccess();
  if (!access) return <SignIn next="/backstage" />;

  const held = (await teamAccess())?.permissions ?? new Set<Permission>();
  const tools = TOOLS.filter((t) => [t.perm].flat().some((p) => held.has(p)));

  return (
    <Card title="Tools">
      <ul className="divide-y divide-line">
        {tools.map((t) => (
          <li key={t.href} className="flex gap-3 py-3">
            <t.icon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-navy/70"
            />
            <div>
              <Link
                href={t.href}
                className="font-semibold text-navy underline-offset-2 hover:text-meeple hover:underline"
              >
                {t.name}
              </Link>
              <p className="text-sm text-ink/60">{t.blurb}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
