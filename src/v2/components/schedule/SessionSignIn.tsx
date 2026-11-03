"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** The signed-out session modal's sign-in offer; signing in comes back to it. */
export default function SessionSignIn() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const next = search ? `${pathname}?${search}` : pathname;
  return (
    <p className="text-sm text-[#1b1530]/60">
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="font-semibold text-navy underline"
      >
        Sign in
      </Link>{" "}
      to RSVP or bookmark.
    </p>
  );
}
