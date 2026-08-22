"use client";

import { useState, type ReactNode } from "react";
import UpdatesModal from "./UpdatesModal";

// Button that opens the shared mailing-list modal; styling is caller-supplied
// so it can be a hero CTA or an inline text link.
export default function UpdatesButton({
  className,
  children,
  id,
}: {
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      {open && <UpdatesModal onClose={() => setOpen(false)} />}
    </>
  );
}
