import Link from "next/link";
import { connection } from "next/server";
import SignIn from "../SignIn";
import { NameForm } from "../SignInForms";
import { Card } from "../ui";
import { adminAccess } from "@/lib/admin-auth";

const TOOLS = [
  {
    href: "/admin/links",
    name: "Tracking links",
    blurb: "Short /go/ links with UTM attribution.",
  },
  {
    href: "/admin/promo",
    name: "Promo codes",
    blurb: "Mint comp and discount codes on Stripe or BTC.",
  },
  {
    href: "/admin/users",
    name: "Users",
    blurb: "Accounts: grant team access, ban, delete.",
  },
  {
    href: "/admin/schema",
    name: "Database schema",
    blurb: "ER diagram and column-by-column reference for the Postgres schema.",
  },
];

export default async function AdminIndexPage() {
  await connection();

  const access = await adminAccess();
  if (!access) return <SignIn next="/admin" />;
  if (!access.name) return <NameForm />;

  return (
    <Card title="Tools">
      <ul className="divide-y divide-line">
        {TOOLS.map((t) => (
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
