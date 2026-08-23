import { Resend } from "resend";
import { env } from "@/env";
import { SOCIAL_LINKS } from "@/lib/urls";
import { formatTicketCode } from "@/lib/ticket-code";

let cached: Resend | null = null;

/**
 * Resend client, or null when RESEND_API_KEY isn't set so email sends no-op in
 * local dev (mirroring the Airtable graceful-degrade).
 */
function getResend(): Resend | null {
  if (cached) return cached;
  const key = env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

const FROM = "Metagame 2026 <tickets@metagame.games>";
const TEAM = "team@metagame.games";
// Email clients load images over the network, so assets must point at the
// deployed site regardless of which environment sent the email.
const SITE = "https://metagame.games";

export type TicketConfirmationEmail = {
  to: string;
  purchaserName?: string;
  tierLabel: string;
  /** Dollars paid (0 for comps). */
  usdPaid?: number;
  /** Pre-discount price (struck through when it differs from usdPaid). */
  usdFull?: number;
  /** Stripe-hosted receipt page (charge.receipt_url). */
  receiptUrl?: string;
  /** Promotion code redeemed at checkout. */
  discountCode?: string;
  /** 6-char ticket code (dashless; rendered as XXX-XXX). */
  ticketCode?: string;
  test?: boolean;
};

/**
 * Pure template: subject + HTML + text bodies. `assetBase` overrides the asset
 * host for local previews; emails themselves always use the deployed site.
 */
export function renderTicketConfirmationEmail(
  {
    to,
    purchaserName,
    tierLabel,
    usdPaid,
    usdFull,
    receiptUrl,
    discountCode,
    ticketCode,
    test = false,
  }: TicketConfirmationEmail,
  assetBase: string = SITE,
) {
  const discounted = usdFull != null && usdFull > (usdPaid ?? 0);

  // Prefill the mailing-list form (modal opens via #updates; params must precede
  // the hash). Signup stays an explicit submit — the link only fills the fields.
  const prefill = new URLSearchParams({
    ...(to ? { email: to } : {}),
    ...(purchaserName ? { name: purchaserName } : {}),
  }).toString();
  const mailingListUrl = `${SITE}/${prefill ? `?${prefill}` : ""}#updates`;
  const paidLine = `Amount paid: $${(usdPaid ?? 0).toFixed(2)}${
    discounted
      ? ` (was $${usdFull.toFixed(2)}` +
        (discountCode ? `, code ${discountCode})` : ")")
      : ""
  }`;

  const subject = `${test ? "TEST: " : ""}Metagame 2026 Ticket`;

  const html = `
      <div style="display: none; max-height: 0; overflow: hidden;">You're coming to Metagame!</div>
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin: 24px 0;">
          <img src="${assetBase}/dice_logo.png" alt="METAGAME" width="360" style="max-width: 100%; height: auto;" />
        </div>

        <h1 style="color: #333; text-align: center;">Ready to play.</h1>

        <p>Hi ${purchaserName || "there"},</p>

        <p>Your Metagame 2026 ticket is confirmed. We're excited to see you there!</p>

        <p>Please join <a href="${SOCIAL_LINKS.DISCORD}">our Discord server</a>, where much future relevant communication will take place.</p>

        <p>Have questions? Check out our <a href="${SITE}/#faq">FAQ</a>. More questions? Reply to this email.</p>

        <p>To hear about future events, <a href="${mailingListUrl}">join the general Metagame mailing list</a>.</p>

        <p>See you at Metagame 2026!</p>

        <div style="background-color: #f5f5f5; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Ticket Details</h2>
          <p><strong>Name:</strong> ${purchaserName || "—"}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Type:</strong> ${tierLabel}</p>
          ${ticketCode ? `<p><strong>Ticket code:</strong> <span style="font-family: monospace; font-size: 15px;">${formatTicketCode(ticketCode)}</span></p>` : ""}
          <p><strong>Amount Paid:</strong> ${discounted ? `<span style="text-decoration: line-through; color: #999;">$${usdFull.toFixed(2)}</span> ` : ""}$${(usdPaid ?? 0).toFixed(2)}${discountCode && discounted ? ` (<strong>${discountCode}</strong>)` : ""}</p>
          ${receiptUrl ? `<p><a href="${receiptUrl}">View your receipt</a></p>` : ""}
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Information</h3>
          <p><strong>Dates:</strong> Friday, November 6 &ndash; Sunday, November 8, 2026 <span style="font-size: 13px;">(add to calendar: <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Metagame+2026&dates=20261106T140000/20261108T210000&ctz=America/Los_Angeles&location=Lighthaven%2C+2740+Telegraph+Avenue%2C+Berkeley%2C+CA&details=https%3A%2F%2Fmetagame.games">Google</a> &middot; <a href="${SITE}/metagame-2026.ics">Apple/Outlook</a>)</span></p>
          <p><strong>Location:</strong> <a href="https://lighthaven.space">Lighthaven</a>, 2740 Telegraph Avenue, Berkeley, CA</p>
        </div>

        <p style="font-size: 12px; color: #aaa; font-style: italic;">This is not a puzzle.</p>

        <div style="text-align: center; margin: 32px 0 16px;">
          <img src="${assetBase}/images/arbor-tree.png" alt="Arbor" width="56" style="height: auto;" />
          <p style="font-size: 12px; color: #888; margin: 8px 0 0; font-style: italic;">&copy; 2026 Arbor</p>
        </div>
      </div>
    `;

  const text = `
Ready to play.

Hi ${purchaserName || "there"},

Your Metagame 2026 ticket is confirmed. We're excited to see you there!

Please join our Discord server, where much future relevant communication will take place: ${SOCIAL_LINKS.DISCORD}

Have questions? Check out our FAQ (${SITE}/#faq). More questions? Reply to this email.

To hear about future events, join the general Metagame mailing list: ${mailingListUrl}

See you at Metagame 2026!

Ticket Details
- Name: ${purchaserName || "—"}
- Email: ${to}
- Type: ${tierLabel}
${ticketCode ? `- Ticket code: ${formatTicketCode(ticketCode)}` : ""}
- ${paidLine}
${receiptUrl ? `- Receipt: ${receiptUrl}` : ""}

Event Information
- Dates: Friday, November 6 – Sunday, November 8, 2026
- Add to calendar: ${SITE}/metagame-2026.ics
- Location: Lighthaven (https://lighthaven.space), 2740 Telegraph Avenue, Berkeley, CA

This is not a puzzle.

© 2026 Arbor
    `.trim();

  return { subject, html, text };
}

export async function sendTicketConfirmationEmail(
  data: TicketConfirmationEmail,
) {
  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email] Resend not configured — confirmation not sent: ${data.to}`,
    );
    return { sent: false as const, reason: "resend-not-configured" };
  }

  const { subject, html, text } = renderTicketConfirmationEmail(data);
  const { error } = await resend.emails.send({
    from: FROM,
    to: data.to,
    bcc: [TEAM],
    replyTo: [TEAM],
    subject,
    html,
    text,
  });

  if (error) throw new Error(`Resend send failed: ${error.message}`);
  return { sent: true as const };
}

/** Notify the team of a backend failure; no-ops (with a warn) when unconfigured. */
export async function sendAdminErrorEmail(errorMessage: string) {
  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email] Resend not configured — admin error not sent: ${errorMessage}`,
    );
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: [TEAM],
    subject: "**URGENT** METAGAME Admin Error",
    html: `<p>An error occurred: ${errorMessage}</p>`,
  });
}
