/**
 * Central environment-variable contract. validateEnv() (wired into next.config.ts)
 * warns on missing required vars locally so dev works without creds, but throws on
 * Vercel so a misconfigured deploy fails the build instead of silently shipping.
 * Keep in sync with .env.example.
 */

type EnvSpec = {
  name: string;
  required: boolean;
  description: string;
};

const ENV_SPEC: EnvSpec[] = [
  {
    name: "AIRTABLE_API_KEY",
    required: true,
    description:
      "Airtable personal access token (data.records:write) — destination for email signups",
  },
  {
    name: "AIRTABLE_BASE_ID",
    required: true,
    description: 'Airtable base id (starts with "app") holding the signups table',
  },
  {
    name: "AIRTABLE_TABLE_ID",
    required: true,
    description: 'Airtable table id (starts with "tbl") or table name for signups',
  },
  {
    name: "AIRTABLE_EMAIL_FIELD",
    required: false,
    description: 'Email column name in the signups table (defaults to "Email")',
  },
];

let alreadyValidated = false;

/** Warns on missing required env vars locally; throws on Vercel so a bad deploy fails the build. */
export function validateEnv(): void {
  // next.config is evaluated more than once per build; only act once per process.
  if (alreadyValidated) return;
  alreadyValidated = true;

  const missing = ENV_SPEC.filter((v) => v.required && !process.env[v.name]);
  if (missing.length === 0) return;

  const lines = missing.map((v) => `   • ${v.name} — ${v.description}`);
  const summary = `Missing ${missing.length} required environment variable${missing.length > 1 ? "s" : ""}:`;

  // On Vercel, fail the build instead of shipping a deploy that silently drops signups.
  if (process.env.VERCEL) {
    throw new Error([summary, ...lines].join("\n"));
  }

  console.warn(
    ["", `⚠  ${summary}`, ...lines, "   Copy .env.example to .env.local and fill these in.", ""].join("\n"),
  );
}

/** Typed, server-side accessor for env values (with defaults applied). */
export const env = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_ID: process.env.AIRTABLE_TABLE_ID,
  AIRTABLE_EMAIL_FIELD: process.env.AIRTABLE_EMAIL_FIELD ?? "Email",
} as const;
