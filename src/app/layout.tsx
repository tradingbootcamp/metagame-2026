import type { Metadata } from "next";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Metagame 2026",
  description:
    "Metagame 2026 — the boutique conference about games returns. Get notified.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bebasNeue.variable} ${spaceGrotesk.variable} h-full antialiased`}
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
