"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { FaTimes } from "react-icons/fa";

const PlanChangeContext = createContext<(() => void) | null>(null);

/** Tells the enclosing session modal a plan changed, if there is one. */
export function useNotePlanChange() {
  return useContext(PlanChangeContext);
}

/**
 * A session's details over the page. Closing replaces the URL with `closeHref`
 * (the page without its ?session= param, or /schedule from the session's own
 * page), so nothing underneath remounts.
 */
export default function SessionModal({
  closeHref,
  labelledBy,
  children,
}: {
  closeHref: string;
  labelledBy: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const planChanged = useRef(false);
  const notePlanChange = useCallback(() => {
    planChanged.current = true;
  }, []);

  const close = useCallback(() => {
    router.replace(closeHref, { scroll: false });
  }, [router, closeHref]);

  // The page underneath wasn't re-rendered for the click, so an RSVP or
  // bookmark made here reaches its lists (My sessions, the account) once the
  // modal goes, however it was closed (browser back included).
  useEffect(
    () => () => {
      if (planChanged.current) router.refresh();
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Radix preventDefaults the Escape that dismisses a nested layer.
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [close]);

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1b1530]/70 p-4"
    >
      <div className="relative max-h-[85vh] w-full max-w-[720px] overflow-y-auto bg-[#fff5e4] p-6 text-[#1b1530] shadow-2xl sm:p-10">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center text-[#1b1530]/50 transition-colors hover:text-[#1b1530]"
        >
          <FaTimes size={18} />
        </button>
        <PlanChangeContext value={notePlanChange}>{children}</PlanChangeContext>
      </div>
    </div>
  );
}
