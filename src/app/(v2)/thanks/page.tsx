import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/v2/components/ContentPage";
import { Button } from "@/v2/components/ui/button";

export const metadata: Metadata = {
  title: "Thanks — Metagame 2026",
};

export default function ThanksPage() {
  return (
    <ContentPage
      eyebrow="Ticket confirmed"
      title="You're in."
      intro={
        <>
          <p>
            Thanks for grabbing a ticket to Metagame 2026 &mdash; your order is
            confirmed and a receipt is on its way. See you November 6&ndash;8 in
            Berkeley.
          </p>
          <p className="mt-4">
            We&apos;ve also added you to the Metagame mailing list for news
            about this and future events. You can unsubscribe at any time.
          </p>
        </>
      }
    >
      <div className="flex max-w-[640px] flex-col items-start gap-8">
        <Button asChild variant="navy">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    </ContentPage>
  );
}
