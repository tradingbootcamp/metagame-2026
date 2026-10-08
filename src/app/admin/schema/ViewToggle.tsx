"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VIEWS = [
  { href: "/admin/schema", label: "Diagram" },
  { href: "/admin/schema/list", label: "List" },
];

export default function ViewToggle() {
  const pathname = usePathname();
  return (
    <nav className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
      {VIEWS.map((v) => {
        const active = pathname === v.href;
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1 transition-colors ${
              active
                ? "bg-navy text-white"
                : "text-ink/70 hover:bg-cream hover:text-navy"
            }`}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
