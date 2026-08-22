import { Resend } from "resend";
import { env } from "@/env";

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

const FROM = "Metagame 2026 <tickets@mail.metagame.games>";
const TEAM = "team@metagame.games";
// Email clients load images over the network, so assets must point at the
// deployed site regardless of which environment sent the email.
const SITE = "https://metagame.games";

export type TicketConfirmationEmail = {
  to: string;
  purchaserName?: string;
  tierLabel: string;
  /** Dollars paid. 0 (or undefined) renders as a comped ticket. */
  usdPaid?: number;
  stripePaymentId?: string;
  test?: boolean;
};

/**
 * Pure template: subject + HTML + text bodies. `assetBase` overrides the asset
 * host for local previews; emails themselves always use the deployed site.
 */
export function renderTicketConfirmationEmail(
  {
    purchaserName,
    tierLabel,
    usdPaid,
    stripePaymentId,
    test = false,
  }: Omit<TicketConfirmationEmail, "to">,
  assetBase: string = SITE,
) {
  const comped = !usdPaid;
  const paidLine = comped
    ? "This ticket is comped — nothing owed."
    : `Amount paid: $${usdPaid.toFixed(2)}`;

  const subject = `${test ? "TEST: " : ""}Your Metagame 2026 ticket is confirmed`;

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin: 24px 0;">
          <img src="${assetBase}/dice_logo.png" alt="METAGAME" width="360" style="max-width: 100%; height: auto;" />
        </div>

        <h1 style="color: #333;">Your ticket is confirmed</h1>

        <p>Hi ${purchaserName || "there"},</p>

        <p>Your Metagame 2026 ticket is confirmed. We're excited to see you there!</p>

        <p>More information about the conference will be coming soon.</p>

        <p>If you want to, <a href="${SITE}/#updates">join our mailing list</a> for future events.</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Ticket Details</h2>
          <p><strong>Ticket:</strong> ${tierLabel}</p>
          <p>${comped ? "<strong>This ticket is comped — nothing owed.</strong>" : `<strong>Amount Paid:</strong> $${usdPaid.toFixed(2)}`}</p>
          ${stripePaymentId ? `<p><strong>Stripe Payment ID:</strong> ${stripePaymentId}</p>` : ""}
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Event Information</h3>
          <p><strong>Dates:</strong> Friday, November 6 &ndash; Sunday, November 8, 2026</p>
          <p><strong>Location:</strong> Lighthaven Campus, 2740 Telegraph Avenue, Berkeley, CA</p>
        </div>

        <p>Questions? Just reply to this email.</p>

        <p>See you at Metagame 2026!</p>

        <div style="text-align: center; margin: 32px 0 16px;">
          <img src="${assetBase}/images/arbor-tree.png" alt="Arbor" width="56" style="height: auto;" />
          <p style="font-size: 12px; color: #888; margin: 8px 0 0;">&copy; 2026 Arbor</p>
        </div>
      </div>
    `;

  const text = `
Your ticket is confirmed

Hi ${purchaserName || "there"},

Your Metagame 2026 ticket is confirmed. We're excited to see you there!

More information about the conference will be coming soon.

If you want to, join our mailing list for future events: ${SITE}/#updates

Ticket Details
- Ticket: ${tierLabel}
- ${paidLine}
${stripePaymentId ? `- Stripe Payment ID: ${stripePaymentId}` : ""}

Event Information
- Dates: Friday, November 6 – Sunday, November 8, 2026
- Location: Lighthaven Campus, 2740 Telegraph Avenue, Berkeley, CA

Questions? Just reply to this email.

See you at Metagame 2026!

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
