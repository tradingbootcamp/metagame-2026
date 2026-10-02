import type { Metadata } from "next";
import Link from "next/link";
import { purchaseBuyer, type PurchaseRef } from "@/lib/purchase-buyer";
import ContentPage from "@/v2/components/ContentPage";
import MailingListOptOut from "@/v2/components/tickets/MailingListOptOut";
import { Button } from "@/v2/components/ui/button";

export const metadata: Metadata = {
  title: "Mailing list — Metagame 2026",
  robots: { index: false },
};

type Params = { session_id?: string | string[]; charge_id?: string | string[] };

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

// Landing page for the opt-out link in the ticket confirmation email. The
// opt-out itself is a button press, so a mail scanner following the link
// can't unsubscribe anyone.
export default async function MailingListOptOutPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const sessionId = first(params.session_id);
  const chargeId = first(params.charge_id);
  const purchase: PurchaseRef | null = sessionId
    ? { sessionId }
    : chargeId
      ? { chargeId }
      : null;
  const buyer = purchase && (await purchaseBuyer(purchase));

  return (
    <ContentPage
      eyebrow="Mailing list"
      title="Opt out"
      intro={
        buyer ? (
          <p>
            We added {buyer.email} to the Metagame mailing list when you bought
            your ticket. Opting out only stops news about this and future events
            &mdash; you&apos;ll still get emails about your ticket.
          </p>
        ) : (
          <p>
            We couldn&apos;t find that purchase. Every mailing-list email also
            has an unsubscribe link.
          </p>
        )
      }
    >
      <div className="flex max-w-[640px] flex-col items-start gap-8">
        {purchase && buyer ? (
          <MailingListOptOut purchase={purchase} email={buyer.email} />
        ) : null}
        <Button asChild variant="navy">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    </ContentPage>
  );
}
