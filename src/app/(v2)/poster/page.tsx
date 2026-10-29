import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { GENERIC_POSTER_SLUG, POSTER_ORIGIN } from "@/lib/poster-options";
import { shortUrl } from "@/lib/tracking-links";
import { Button } from "@/v2/components/ui/button";
import poster from "../../../../public/images/poster/d20-poster.png";

export const metadata: Metadata = {
  title: "The Dice Poster — Metagame 2026",
  description:
    "Solve the roll on the Metagame poster and enter the result at checkout for $20 off your ticket. Nov 6–8, 2026 at Lighthaven, Berkeley.",
  openGraph: {
    images: [{ url: poster.src, width: poster.width, height: poster.height }],
  },
};

// The artwork's QR box, in the 612×792pt page that poster-pdf.ts measures.
const QR = { x: 95, top: 584, size: 83 };
const PAGE = { width: 612, height: 792 };

// The general poster as a page of its own, for sharing the $20 dice puzzle.
// /posters is the print generator; this one has no print controls.
export default async function PosterPage() {
  // The artwork's original code is masked out of the image; this one goes to
  // the Generic poster link, so a print of this page attributes like /posters'.
  const qr = await QRCode.toString(
    shortUrl(POSTER_ORIGIN, GENERIC_POSTER_SLUG),
    {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 4,
    },
  );
  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center px-4 pt-24 pb-16 sm:px-8">
      <div className="relative w-full overflow-hidden rounded-xl shadow-[0_8px_24px_rgba(23,48,89,0.12)]">
        <Image
          src={poster}
          alt="Metagame poster: Nov 6–8, 2026 at Lighthaven Campus, Berkeley. Twenty-sided dice covered in letters sit on a table. Enter the result of this roll at checkout for $20 off your ticket."
          priority
          sizes="(min-width: 760px) 728px, 100vw"
          className="h-auto w-full"
        />
        <div
          aria-hidden
          className="absolute [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
          style={{
            left: `${(QR.x / PAGE.width) * 100}%`,
            top: `${(QR.top / PAGE.height) * 100}%`,
            width: `${(QR.size / PAGE.width) * 100}%`,
            height: `${(QR.size / PAGE.height) * 100}%`,
          }}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button asChild variant="default">
          <Link href="/#tickets">Get tickets</Link>
        </Button>
        <Button asChild variant="navy">
          <Link href="/">What is Metagame?</Link>
        </Button>
      </div>
    </div>
  );
}
