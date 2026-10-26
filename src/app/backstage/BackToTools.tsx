import Link from "next/link";

/** Back button to the /backstage index, shared by every tool's header. */
export default function BackToTools() {
  return (
    <Link
      href="/backstage"
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1 text-sm whitespace-nowrap text-ink/70 transition-colors hover:border-navy hover:text-navy"
    >
      <span aria-hidden="true">←</span> Tools
    </Link>
  );
}
