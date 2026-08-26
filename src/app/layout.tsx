import type { Metadata } from "next";
import {
  Bebas_Neue,
  Inter,
  Roboto,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const inter = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

// Button label font (baked into the shared shadcn Button base classes).
const roboto = Roboto({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Metagame — Nov 6-8, 2026",
  description:
    "Metagame 2026 — a convention of games, designs, and puzzles. Nov 6-8, 2026 at Lighthaven, Berkeley, California.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Lets Next suspend the CSS smooth scroll during route changes so a new
      // page lands at the top instead of animating up from the old scroll spot.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${bebasNeue.variable} ${spaceGrotesk.variable} ${inter.variable} ${spaceMono.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Apply the saved ticket currency before first paint (localStorage is
            client-only, so the server can't know it) — keeps the tickets toggle
            from flashing USD→BTC on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem('ticket-currency');document.documentElement.dataset.currency=c==='btc'?'btc':'usd'}catch(e){document.documentElement.dataset.currency='usd'}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
