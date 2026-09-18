import ContactProvider from "@/v2/components/contact/ContactProvider";
import SiteFooter from "@/v2/components/SiteFooter";
import SiteShell from "@/v2/components/SiteShell";
import HatToast from "@/v2/hat-trick/HatToast";

// The rewritten site. Everything it renders lives under src/v2/ — see
// src/v2/README.md. The previous one-pager is still served at /legacy.
//
// Puzzle in progress, parked for the MVP: src/v2/stage/ holds a page-space
// physics layer (a die that rides the page and collides with its layout).
// Nothing imports it, so none of it ships. To bring it back, wrap this div in
// <Stage> with `sprites={<ScrollDie />}` — see the README's Stage section.
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background font-[family-name:var(--font-inter)] leading-[1.55] text-ink">
      <ContactProvider>
        <SiteShell>{children}</SiteShell>
        <SiteFooter />
      </ContactProvider>
      <HatToast />
    </div>
  );
}
