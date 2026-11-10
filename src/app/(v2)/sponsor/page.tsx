import type { Metadata } from "next";
import ContentPage from "@/v2/components/ContentPage";
import { HEADING } from "@/v2/components/styles";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Button } from "@/v2/components/ui/button";
import { MANIFUND_URL, SPONSOR_FORM_URL } from "@/v2/lib/links";

export const metadata: Metadata = {
  title: "Sponsor — Metagame 2027",
  description: "Sponsor Metagame 2027.",
};

export default function SponsorPage() {
  return (
    <ContentPage
      title="Sponsor Metagame 2027"
      intro={
        <>
          Metagame exists in large part thanks to support from our sponsors. If
          you&rsquo;re interested in making Metagame 2027 happen, fill out our{" "}
          <a
            href={SPONSOR_FORM_URL}
            className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
          >
            Sponsor Interest Form
          </a>
          .
        </>
      }
    >
      <section
        id="donate"
        className="scroll-mt-16 rounded-xl border border-line bg-white px-6 py-7 sm:px-8"
      >
        <h2 className={`${HEADING} text-[clamp(22px,3vw,28px)] text-navy`}>
          Tax-deductible support
        </h2>
        <p className="mt-3 max-w-[640px] text-base text-ink/75">
          Metagame accepts tax-deductible donations through Manifund, a
          501(c)(3) that fiscally sponsors the con. Donors get our thanks and
          their name featured, but for legal reasons cannot get comped tickets
          or other direct material benefits.
        </p>
        <Button asChild variant="navy" size="lg" className="mt-5">
          <a href={MANIFUND_URL} target="_blank" rel="noopener noreferrer">
            Donate on Manifund <FaExternalLinkAlt size={12} aria-hidden />
          </a>
        </Button>
      </section>
    </ContentPage>
  );
}
