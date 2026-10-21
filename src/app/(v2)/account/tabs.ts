export const ACCOUNT_TABS = ["profile", "tickets", "sessions"] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function parseAccountTab(value: string | undefined): AccountTab {
  return ACCOUNT_TABS.find((t) => t === value) ?? "profile";
}
