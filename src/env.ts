/**
 * Central environment-variable contract for the site.
 *
 * Keep this in sync with `.env.example`. `validateEnv()` is wired into
 * `next.config.ts`, so it runs on `next dev` and `next build` and prints a
 * warning listing anything required that's missing. It never throws — the site
 * still builds and runs without credentials; the signup form just can't reach
 * Airtable until they're set.
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
    description:
      'Airtable base id (starts with "app") holding the signups table',
  },
  {
    name: "AIRTABLE_TABLE_ID",
    required: true,
    description:
      'Airtable table id (starts with "tbl") or table name for signups',
  },
  {
    name: "AIRTABLE_EMAIL_FIELD",
    required: false,
    description: 'Email column name in the signups table (defaults to "Email")',
  },
];

let alreadyValidated = false;

/** Logs a warning for any missing required env vars. Never throws. */
export function validateEnv(): void {
  // next.config is evaluated more than once per build; only warn once per process.
  if (alreadyValidated) return;
  alreadyValidated = true;

  const missing = ENV_SPEC.filter((v) => v.required && !process.env[v.name]);
  if (missing.length === 0) return;

  const lines = missing.map((v) => `   • ${v.name} — ${v.description}`);
  console.warn(
    [
      "",
      `⚠  Missing ${missing.length} required environment variable${missing.length > 1 ? "s" : ""}:`,
      ...lines,
      "   Copy .env.example to .env.local and fill these in. The site still runs,",
      "   but email signups won't be stored until they're set.",
      "",
    ].join("\n"),
  );
}

/** Typed, server-side accessor for env values (with defaults applied). */
export const env = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_ID: process.env.AIRTABLE_TABLE_ID,
  AIRTABLE_EMAIL_FIELD: process.env.AIRTABLE_EMAIL_FIELD ?? "Email",
} as const;
