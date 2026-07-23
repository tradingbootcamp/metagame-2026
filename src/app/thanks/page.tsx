import type { Metadata } from "next";
import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import ThanksOptIn from "@/components/ThanksOptIn";

export const metadata: Metadata = {
  title: "Thanks — Metagame 2026",
};

// film-grain texture, shared with the home page so /thanks sits on the same surface
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23g)' opacity='0.35'/%3E%3C/svg%3E\")";

// Pull the buyer's email from a completed Checkout Session. Returns null unless
// Stripe is configured, the session exists, and it actually paid — we never
// prefill the opt-in from an unverified or unpaid session (the id is attacker-supplied).
async function paidBuyer(
  sessionId: string | undefined,
): Promise<{ email: string; name?: string } | null> {
  if (!sessionId) return null;
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return null;
    const email = session.customer_details?.email;
    if (!email) return null;
    return { email, name: session.customer_details?.name ?? undefined };
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
  const buyer = await paidBuyer(
    Array.isArray(session_id) ? session_id[0] : session_id,
  );

  return (
    <div className="relative min-h-dvh bg-[#fff5e4] font-[family-name:var(--font-space-grotesk)] text-[#1b1530]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-[clamp(20px,5vw,56px)] py-[clamp(24px,4vh,48px)]">
        <div className="flex w-full max-w-[480px] flex-col items-center gap-5 border-[1.5px] border-[#1b1530] bg-[#eaa35a] p-[clamp(24px,5vw,40px)]">
          <p className="m-0 text-center font-[family-name:var(--font-bebas)] text-[clamp(34px,8vw,56px)] leading-tight tracking-[0.04em]">
            You&apos;re in.
          </p>
          <p className="text-center text-base text-[#1b1530]/80">
            Thanks for grabbing a ticket to Metagame 2026 — your order is
            confirmed and a receipt is on its way. See you November 6&ndash;8 in
            Berkeley.
          </p>
          {buyer ? <ThanksOptIn email={buyer.email} name={buyer.name} /> : null}
        </div>

        <Link
          href="/"
          className="text-sm text-[#1b1530]/70 underline transition hover:text-[#1b1530]"
        >
          Back to the site
        </Link>
      </main>
    </div>
  );
}
