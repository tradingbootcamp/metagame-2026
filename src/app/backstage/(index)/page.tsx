import Link from "next/link";
import { connection } from "next/server";
import SignIn from "../SignIn";
import { NameForm } from "../SignInForms";
import { Card } from "../ui";
import { teamAccess } from "@/lib/access";
import { toolAccess } from "@/lib/admin-auth";
import {
  ADMIN_PASSWORD_PERMISSIONS,
  expand,
  type Permission,
} from "@/lib/permissions";

const TOOLS: { href: string; name: string; blurb: string; perm: Permission }[] =
  [
    {
      href: "/backstage/links",
      name: "Tracking links",
      blurb: "Short /go/ links with UTM attribution.",
      perm: "links.manage",
    },
    {
      href: "/backstage/promo",
      name: "Promo codes",
      blurb: "Mint comp and discount codes on Stripe or BTC.",
      perm: "promo.manage",
    },
    {
      href: "/backstage/users",
      name: "Users",
      blurb: "Accounts, their roles and permissions.",
      perm: "users.view",
    },
    {
      href: "/backstage/roles",
      name: "Roles",
      blurb: "Bundles of permissions to hand out, like Volunteer.",
      perm: "roles.manage",
    },
    {
      href: "/backstage/tickets",
      name: "Tickets",
      blurb: "Every ticket with its buyer, holder and attendee.",
      perm: "tickets.view",
    },
    {
      href: "/backstage/schedule",
      name: "Schedule",
      blurb: "Rooms and sessions for the 2026 program, on a day-by-room grid.",
      perm: "schedule.manage",
    },
    {
      href: "/backstage/api-keys",
      name: "API keys",
      blurb:
        "Keys for scripts and Claude sessions to edit the schedule over HTTP.",
      perm: "api_keys.manage",
    },
    {
      href: "/backstage/schema",
      name: "Database schema",
      blurb:
        "ER diagram and column-by-column reference for the Postgres schema.",
      perm: "schema.view",
    },
  ];

export default async function AdminIndexPage() {
  await connection();

  const access = await toolAccess();
  if (!access) return <SignIn next="/backstage" />;
  if (!access.name) return <NameForm />;

  const held =
    access.via === "account"
      ? ((await teamAccess())?.permissions ?? new Set<Permission>())
      : expand(ADMIN_PASSWORD_PERMISSIONS);
  const tools = TOOLS.filter((t) => held.has(t.perm));

  return (
    <Card title="Tools">
      <ul className="divide-y divide-line">
        {tools.map((t) => (
          <li key={t.href} className="py-3">
            <Link
              href={t.href}
              className="font-semibold text-navy underline-offset-2 hover:text-meeple hover:underline"
            >
              {t.name}
            </Link>
            <p className="text-sm text-ink/60">{t.blurb}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
