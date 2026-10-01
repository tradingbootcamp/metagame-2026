import type { Metadata } from "next";
import Link from "next/link";
import { signupCreatedAt } from "@/lib/airtable";
import { getStripe } from "@/lib/stripe";
import ContentPage from "@/v2/components/ContentPage";
import ThanksOptOut from "@/v2/components/tickets/ThanksOptOut";
import { Button } from "@/v2/components/ui/button";

export const metadata: Metadata = {
  title: "Thanks — Metagame 2026",
};

// Pull the buyer's email from a completed Checkout Session. Returns null unless
// Stripe is configured, the session exists, and it actually paid — we never
// show the opt-out for an unverified or unpaid session (the id is attacker-supplied).
async function newlySubscribedBuyer(
  sessionId: string | undefined,
): Promise<{ sessionId: string; email: string } | null> {
  if (!sessionId) return null;
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "unpaid") return null;
    const email = session.customer_details?.email;
    if (!email) return null;
    // A row older than the checkout means they were on the list already (the
    // webhook left them alone); a newer or not-yet-written one is this purchase's.
    const signedUp = await signupCreatedAt(email);
    if (signedUp && signedUp.getTime() < session.created * 1000) return null;
    return { sessionId, email };
  } catch {
    return null;
  }
}

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { session_id } = await searchParams;
  const buyer = await newlySubscribedBuyer(
    Array.isArray(session_id) ? session_id[0] : session_id,
  );

  return (
    <ContentPage
      eyebrow="Ticket confirmed"
      title="You're in."
      intro={
        <p>
          Thanks for grabbing a ticket to Metagame 2026 &mdash; your order is
          confirmed and a receipt is on its way. See you November 6&ndash;8 in
          Berkeley.
        </p>
      }
    >
      <div className="flex max-w-[640px] flex-col items-start gap-8">
        {buyer ? (
          <ThanksOptOut sessionId={buyer.sessionId} email={buyer.email} />
        ) : null}
        <Button asChild variant="navy">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    </ContentPage>
  );
}
