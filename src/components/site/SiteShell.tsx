import ExpandingNav from "./ExpandingNav";

// Section nav: the corner die that unfolds into the section links.
export default function SiteShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ExpandingNav />
      {/* Symmetric gutter kept from the old side rail so the page's center
          doesn't shift; revisit once the corner nav's footprint settles. */}
      <main className="flex-1 overflow-x-clip md:px-20 lg:px-24">
        {children}
      </main>
    </>
  );
}
