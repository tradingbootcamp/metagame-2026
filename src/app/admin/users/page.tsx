import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import SignIn from "../SignIn";
import { Card } from "../ui";
import UsersTable, { type UserRow } from "./UsersTable";
import { adminAccess } from "@/lib/admin-auth";
import { getAuth } from "@/lib/auth";

const PAGE_SIZE = 100;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await connection();

  const access = await adminAccess();
  if (!access) return <SignIn next="/admin/users" />;
  if (access.via !== "account") {
    return (
      <Card title="Users">
        <p className="text-sm text-ink/70">
          Granting access takes an admin account, not the team password.{" "}
          <Link
            href="/login?next=/admin/users"
            className="font-semibold text-meeple underline-offset-2 hover:underline"
          >
            Sign in with yours.
          </Link>
        </p>
      </Card>
    );
  }

  const q = first((await props.searchParams).q).trim();
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
    createdAt: new Date(u.createdAt).toISOString(),
  }));

  return (
    <UsersTable
      rows={rows}
      total={total}
      query={q}
      truncated={total > rows.length}
      me={access.userId}
    />
  );
}
