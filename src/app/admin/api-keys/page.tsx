import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import KeysPanel, { type KeyRow } from "./KeysPanel";
import ToolSignIn from "@/components/ToolSignIn";
import { getDb, schema } from "@/db";
import { can } from "@/lib/access";

const when = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

// Account-only: a key acts as an account, so the password fallback can't mint one.
export default async function AdminApiKeysPage() {
  await connection();
  const session = await can("api_keys.manage");
  if (!session) return <ToolSignIn title="API keys" next="/admin/api-keys" />;

  const { apikey, user } = schema;
  const keys = await getDb()
    .select({
      id: apikey.id,
      label: apikey.name,
      start: apikey.start,
      enabled: apikey.enabled,
      createdAt: apikey.createdAt,
      lastRequest: apikey.lastRequest,
      email: user.email,
      owner: user.name,
    })
    .from(apikey)
    .innerJoin(user, eq(user.id, apikey.referenceId))
    .orderBy(desc(apikey.createdAt));

  const rows: KeyRow[] = keys.map((k) => ({
    id: k.id,
    label: k.label ?? "",
    start: k.start ?? "",
    enabled: k.enabled,
    owner: k.owner.trim() || k.email,
    email: k.email,
    created: when.format(k.createdAt),
    lastUsed: k.lastRequest ? when.format(k.lastRequest) : null,
  }));

  return <KeysPanel rows={rows} />;
}
