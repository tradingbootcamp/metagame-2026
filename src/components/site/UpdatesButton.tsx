"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  // Deep-link: /#<id> opens the modal, so external links (e.g. the ticket
  // confirmation email) can land people directly on the mailing-list signup.
  useEffect(() => {
    if (id && window.location.hash === `#${id}`) {
      // Deferred: opening during the effect itself trips react-hooks/set-state-in-effect
      // and would mismatch the server-rendered (closed) markup during hydration.
      const t = setTimeout(() => setOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [id]);

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
