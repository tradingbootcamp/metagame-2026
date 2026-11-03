import ContactProvider from "@/v2/components/contact/ContactProvider";
import SiteFooter from "@/v2/components/SiteFooter";
import SiteShell from "@/v2/components/SiteShell";
import FirstSigninFlow from "@/v2/components/first-signin/FirstSigninFlow";
import HatToast from "@/v2/hat-trick/HatToast";

// The rewritten site. Everything it renders lives under src/v2/ — see
// src/v2/README.md. The previous one-pager is still served at /legacy.
//
// Puzzle in progress, parked for the MVP: src/v2/stage/ holds a page-space
// physics layer (a die that rides the page and collides with its layout).
// Nothing imports it, so none of it ships. To bring it back, wrap this div in
// <Stage> with `sprites={<ScrollDie />}` — see the README's Stage section.
//
// @modal opens a session over whatever page linked to it. Next matches a
// root-level intercept from every page, so the slot has to live in the layout
// they all share: anywhere lower, the intercept swaps that layout in and
// unmounts the page underneath (the schedule lost its day and view on close).
export default function SiteLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background font-[family-name:var(--font-inter)] leading-[1.55] text-ink">
      <ContactProvider>
        <SiteShell>{children}</SiteShell>
        <SiteFooter />
      </ContactProvider>
      {modal}
      <HatToast />
      <FirstSigninFlow />
    </div>
  );
}
