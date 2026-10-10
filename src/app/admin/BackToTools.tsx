import Link from "next/link";

/** Back button to the /admin index, shared by every tool's header. */
export default function BackToTools() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1 text-sm text-ink/70 transition-colors hover:border-navy hover:text-navy"
    >
      <span aria-hidden="true">←</span> All tools
    </Link>
  );
}
