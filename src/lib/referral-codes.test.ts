import assert from "node:assert/strict";
import { test } from "node:test";
import { referralRedirectPath } from "./referral-codes.ts";

test("expands a known code to its UTM triple", () => {
  assert.equal(
    referralRedirectPath("brian"),
    "/?utm_source=brian&utm_medium=referral&utm_campaign=friends",
  );
});

test("matches codes case-insensitively", () => {
  assert.equal(referralRedirectPath("Brian"), referralRedirectPath("brian"));
});

test("unknown codes fall back to / with no params", () => {
  assert.equal(referralRedirectPath("nobody"), "/");
  assert.equal(referralRedirectPath("constructor"), "/");
});
