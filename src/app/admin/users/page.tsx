import { headers } from "next/headers";
import { connection } from "next/server";
import UsersTable, { type UserRow } from "./UsersTable";
import ToolSignIn from "@/components/ToolSignIn";
import { adminSession, getAuth } from "@/lib/auth";

const PAGE_SIZE = 100;

const joined = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Account-only, no password fallback: the role and ban calls need an admin session.
export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await connection();

  const session = await adminSession();
  if (!session) return <ToolSignIn title="Users" next="/admin/users" />;

  const q = String((await props.searchParams).q ?? "").trim();
  const { users, total } = await getAuth().api.listUsers({
    query: {
      ...(q && {
        searchValue: q,
        searchField: "email" as const,
        searchOperator: "contains" as const,
      }),
      limit: PAGE_SIZE,
      sortBy: "createdAt",
      sortDirection: "desc" as const,
    },
    headers: await headers(),
  });
  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    admin: u.role === "admin",
    banned: Boolean(u.banned),
    joined: joined.format(new Date(u.createdAt)),
    self: u.id === session.user.id,
  }));

  return (
    <UsersTable
      rows={rows}
      total={total}
      query={q}
      truncated={total > rows.length}
    />
  );
}
