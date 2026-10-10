import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read .env files itself. Node's loader skips vars already
// set in the environment, so a real DATABASE_URL always wins over the file.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — fine on CI
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  // Must match the `casing` passed to drizzle() in src/db/index.ts.
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
