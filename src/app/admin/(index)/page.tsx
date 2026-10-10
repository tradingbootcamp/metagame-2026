import Link from "next/link";
import { connection } from "next/server";
import { NameForm, PasswordForm } from "../SignInForms";
import { Card } from "../ui";
import { isConfigured, readSession } from "@/lib/admin-auth";

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
    href: "/admin/schema",
    name: "Database schema",
    blurb: "ER diagram and column-by-column reference for the Postgres schema.",
  },
];

export default async function AdminIndexPage() {
  await connection();

  if (!isConfigured()) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        Team tools aren’t configured on this deploy — set{" "}
        <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code>.
      </p>
    );
  }

  const session = await readSession();
  if (!session) return <PasswordForm />;
  if (!session.identity) return <NameForm />;

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
