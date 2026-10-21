// Buyers often type "@name"; Discord usernames can't contain "@".
export function cleanDiscordHandle(input: string | null | undefined) {
  return input?.trim().replace(/^@+\s*/, "") || null;
}
