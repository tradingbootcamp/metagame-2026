"use client";

import type { ReactNode } from "react";
import { cn } from "@/v2/lib/utils";
import { useContact, type ContactOptions } from "./ContactProvider";

// Opens the site contact form. Styling is caller-supplied so it can sit inline
// in prose or be a footer item — the replacement for a mailto link.
export default function ContactLink({
  className,
  children,
  subject,
  to,
}: ContactOptions & { className?: string; children: ReactNode }) {
  const open = useContact();
  return (
    <button
      type="button"
      onClick={() => open({ subject, to })}
      className={cn("cursor-pointer text-left", className)}
    >
      {children}
    </button>
  );
}
