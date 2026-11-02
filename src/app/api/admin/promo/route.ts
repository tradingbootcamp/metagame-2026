import {
  authorize,
  error,
  json,
  message,
  readBody,
  str,
} from "@/lib/admin-api";
import {
  CUSTOM_CODE_RE,
  normalizeCustomCode,
  PromoError,
  PURPOSES,
  type MintResult,
} from "@/lib/promo-codes";
import {
  amountOffCoupons,
  findStripeCode,
  listStripeCodes,
  mintStripeCode,
} from "@/lib/promo-codes-stripe";

export const dynamic = "force-dynamic";

/**
 * `?code=`: whether that code exists on Stripe, `{exists, id?, active?,
 * couponId?}`, so a caller can check before minting or recover one it minted.
 * Without `code`, every code /backstage/promo minted, newest first. Reading
 * takes `promo.view`; minting below takes `promo.create`.
 */
export async function GET(request: Request) {
  const access = await authorize("promo.view");
  if (access instanceof Response) return access;
  const raw = new URL(request.url).searchParams.get("code");
  try {
    if (raw === null) return json({ codes: await listStripeCodes() });
    const code = normalizeCustomCode(raw);
    if (!code) return error("Required.", 400, "code");
    if (!CUSTOM_CODE_RE.test(code))
      return error("Letters, digits, and dashes only.", 400, "code");
    const found = await findStripeCode(code);
    return json(found ? { exists: true, ...found } : { exists: false });
  } catch (err) {
    return stripeFailed(err);
  }
}

/**
 * Mints one code, checked as the /backstage/promo form checks it:
 * `{name, purpose, customCode?, maxUses?, email?, notes?}` plus the coupon as
 * `couponId` or `amountOffUsd`, one of which is required. `purpose` must be
 * one of the form's dropdown options. `maxUses` left out or null is unlimited,
 * since a poster's code is shared; a number caps it. A custom code that
 * already exists on Stripe is a 409 carrying the `existing` code.
 */
export async function POST(request: Request) {
  const access = await authorize("promo.create");
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;

  const name = str(body, "name");
  if (!name) return error("Required.", 400, "name");
  const purpose = str(body, "purpose");
  if (!purpose) return error("Required.", 400, "purpose");
  if (!(PURPOSES as readonly string[]).includes(purpose))
    return error(`One of: ${PURPOSES.join(", ")}.`, 400, "purpose");
  const { maxUses = null } = body;
  if (maxUses !== null && !(Number.isInteger(maxUses) && Number(maxUses) >= 1))
    return error("A whole number, at least 1, or null.", 400, "maxUses");
  const customCode = normalizeCustomCode(str(body, "customCode"));
  if (customCode && !CUSTOM_CODE_RE.test(customCode))
    return error("Letters, digits, and dashes only.", 400, "customCode");
  let couponId = str(body, "couponId");
  const { amountOffUsd } = body;
  if (amountOffUsd !== undefined) {
    if (couponId)
      return error(
        "Send couponId or amountOffUsd, not both.",
        400,
        "amountOffUsd",
      );
    if (typeof amountOffUsd !== "number" || !(amountOffUsd > 0))
      return error("A dollar amount above 0.", 400, "amountOffUsd");
  }
  // Never fall through to the default (comp) coupon: a dropped field would
  // otherwise mint a free ticket.
  if (!couponId && amountOffUsd === undefined)
    return error("Send couponId or amountOffUsd.", 400, "couponId");

  try {
    const [existing, coupons] = await Promise.all([
      customCode ? findStripeCode(customCode) : null,
      typeof amountOffUsd === "number"
        ? amountOffCoupons(Math.round(amountOffUsd * 100))
        : null,
    ]);
    if (existing) {
      const archived = existing.active ? "" : " (archived)";
      return json(
        {
          error: `Code ${customCode} already exists${archived}.`,
          field: "customCode",
          existing,
        },
        409,
      );
    }
    if (coupons) {
      if (coupons.length !== 1) {
        const usd = `$${amountOffUsd}`;
        return error(
          coupons.length
            ? `${coupons.length} active coupons take ${usd} off (${coupons.join(", ")}); send couponId.`
            : `No active coupon takes ${usd} off.`,
          400,
          "amountOffUsd",
        );
      }
      couponId = coupons[0];
    }

    const minted = await mintStripeCode({
      name,
      email: str(body, "email"),
      customCode,
      maxUses: maxUses as number | null,
      purpose,
      notes: str(body, "notes"),
      couponId,
      issuedBy: access.name,
    });
    return json(summary(minted), minted.reused ? 200 : 201);
  } catch (err) {
    return stripeFailed(err);
  }
}

const summary = (m: MintResult) => ({
  code: m.code,
  id: m.id,
  active: m.active,
  couponId: m.couponId,
  max: m.max,
  test: m.test,
  ...(m.reused && { reused: true }),
});

function stripeFailed(err: unknown): Response {
  if (err instanceof PromoError) {
    if (err.code === "config") return error(err.message, 503);
    const field = err.code === "collision" ? "customCode" : undefined;
    return error(err.message, 409, field);
  }
  // Stripe refusing the request (an unknown coupon, say) is the caller's to fix.
  const { type, param } = err as { type?: string; param?: string };
  if (type === "StripeInvalidRequestError") {
    const field = param?.includes("coupon") ? "couponId" : undefined;
    return error(message(err), 400, field);
  }
  console.error("[promo api] Stripe call failed:", err);
  return error(message(err), 502);
}
