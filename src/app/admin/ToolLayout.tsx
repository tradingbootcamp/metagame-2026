import Link from "next/link";
import BackToTools from "./BackToTools";
import SessionBar from "./SessionBar";

/** Header + column shared by the tools under /admin; the schema pages size their own. */
export default function ToolLayout({
  title,
  href,
  nav,
  children,
}: {
  title: string;
  href: string;
  /** Extra links after the title. */
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4">
            {href !== "/admin" && <BackToTools />}
            <Link
              href={href}
              className="font-bebas text-xl tracking-wide text-navy"
            >
              {title}
            </Link>
            {nav}
          </nav>
          <SessionBar />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
