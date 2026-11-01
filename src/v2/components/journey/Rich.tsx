"use client";

import Link from "next/link";
import ContactLink from "@/v2/components/contact/ContactLink";
import { ADVISORS, TEAM } from "@/v2/data/team";

const LINK =
  "font-semibold text-navy underline decoration-navy/30 underline-offset-2 hover:decoration-meeple";

// A journey's copy: plain text where [words](url) becomes a link. Site paths
// stay in the tab; anything else opens a new one. `contact:<contactKey>`
// ("[contact Ricki](contact:ricki)") opens the site's contact form to that
// team member instead, so no address is printed.
export default function Rich({
  text,
  contactSubject,
}: {
  text: string;
  /** Prefilled subject for a `contact:` link's message. */
  contactSubject?: string;
}) {
  return (
    <>
      {text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (!m) return part;
        const [, label, href] = m;
        if (href.startsWith("contact:")) {
          const to = href.slice("contact:".length);
          const person = [...TEAM, ...ADVISORS].find(
            (p) => p.contactKey === to,
          );
          return (
            <ContactLink
              key={i}
              to={to}
              toName={person?.name.split(" ")[0]}
              subject={contactSubject}
              className={LINK}
            >
              {label}
            </ContactLink>
          );
        }
        return href.startsWith("/") ? (
          <Link key={i} href={href} className={LINK}>
            {label}
          </Link>
        ) : (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            {label}
          </a>
        );
      })}
    </>
  );
}
