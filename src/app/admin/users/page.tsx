import { count, desc, ilike } from "drizzle-orm";
import { connection } from "next/server";
import UsersTable, { type UserRow } from "./UsersTable";
import ToolSignIn from "@/components/ToolSignIn";
import { getDb, schema } from "@/db";
import { teamAccess } from "@/lib/access";
import { roleNamesFor } from "@/lib/permission-store";
import { claimedCounts } from "@/lib/ticket-store";

const PAGE_SIZE = 100;

const joined = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Account-only, no password fallback: it lists every email.
export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await connection();

  const access = await teamAccess();
  if (!access?.permissions.has("users.manage"))
    return <ToolSignIn title="Users" next="/admin/users" />;

  const q = String((await props.searchParams).q ?? "").trim();
  // Straight from the table: Better Auth's listUsers is admin-only, and
  // users.manage holders needn't be admins.
  const { user } = schema;
  const where = q
    ? ilike(user.email, `%${q.replace(/[\\%_]/g, "\\$&")}%`)
    : undefined;
  const [users, [{ total }]] = await Promise.all([
    getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(PAGE_SIZE),
    getDb().select({ total: count() }).from(user).where(where),
  ]);
  const ids = users.map((u) => u.id);
  const [claimed, roleNames] = await Promise.all([
    claimedCounts(ids),
    roleNamesFor(ids),
  ]);
  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    admin: u.role === "admin",
    roles: roleNames.get(u.id) ?? [],
    banned: Boolean(u.banned),
    joined: joined.format(new Date(u.createdAt)),
    self: u.id === access.session.user.id,
    tickets: claimed.get(u.id) ?? 0,
  }));

  return (
    <UsersTable
      rows={rows}
      total={total}
      query={q}
      truncated={total > rows.length}
      viewerIsAdmin={access.admin}
    />
  );
}
