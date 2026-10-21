import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("ticket-code under plain node", () => {
  // The backfill script imports it without a bundler, so no @/ aliases.
  it("loads and makes a code", () => {
    const out = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "const { ticketCode } = await import('./src/lib/ticket-code.ts'); console.log(ticketCode('pi_test'));",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    expect(out.trim()).toMatch(/^[0-9A-Z]{6}$/);
  });
});
