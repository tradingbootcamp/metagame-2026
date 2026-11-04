import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Each override's site_settings key.
const KEYS = {
  tab: "magnum_opus_tab",
  loans: "magnum_opus_loans",
} as const;

export type OverrideName = keyof typeof KEYS;

export const isOverrideName = (v: unknown): v is OverrideName =>
  typeof v === "string" && Object.hasOwn(KEYS, v);

/** true / false force it on / off; null leaves it on its schedule. */
export type Override = boolean | null;

export type OverrideSetting = {
  override: Override;
  updatedAt: Date | null;
  updatedBy: string | null;
};

const UNSET: OverrideSetting = {
  override: null,
  updatedAt: null,
  updatedBy: null,
};

export async function loadOverrides(): Promise<
  Record<OverrideName, OverrideSetting>
> {
  const { siteSettings, user } = schema;
  const rows = await getDb()
    .select({
      key: siteSettings.key,
      value: siteSettings.value,
      updatedAt: siteSettings.updatedAt,
      name: user.name,
    })
    .from(siteSettings)
    .leftJoin(user, eq(user.id, siteSettings.updatedBy))
    .where(inArray(siteSettings.key, Object.values(KEYS)));
  const read = (name: OverrideName): OverrideSetting => {
    const row = rows.find((r) => r.key === KEYS[name]);
    if (!row) return UNSET;
    return {
      override: typeof row.value === "boolean" ? row.value : null,
      updatedAt: row.updatedAt,
      updatedBy: row.name,
    };
  };
  return { tab: read("tab"), loans: read("loans") };
}

export async function setOverride(
  name: OverrideName,
  override: Override,
  userId: string,
): Promise<void> {
  const { siteSettings } = schema;
  // Kept as a row even when cleared, so the tool can say who cleared it.
  await getDb()
    .insert(siteSettings)
    .values({ key: KEYS[name], value: override, updatedBy: userId })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: override, updatedBy: userId, updatedAt: new Date() },
    });
}
