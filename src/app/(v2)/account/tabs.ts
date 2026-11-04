import { magnumOpusOpen } from "@/lib/magnum-opus";

export const ACCOUNT_TABS = [
  "profile",
  "tickets",
  "sessions",
  "megagame",
  "magnumOpus",
] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function visibleAccountTabs(
  override: boolean | null = null,
  now = Date.now(),
): AccountTab[] {
  return ACCOUNT_TABS.filter(
    (t) => t !== "magnumOpus" || magnumOpusOpen(override, now),
  );
}

/** A hidden or unknown tab falls back to the profile. */
export function parseAccountTab(
  value: string | undefined,
  tabs: readonly AccountTab[] = ACCOUNT_TABS,
): AccountTab {
  return tabs.find((t) => t === value) ?? "profile";
}
