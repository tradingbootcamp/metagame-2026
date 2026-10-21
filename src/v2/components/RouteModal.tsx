"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { FaTimes } from "react-icons/fa";

/** A modal over the page for an intercepted route; closing goes back. */
export default function RouteModal({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [router]);

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) router.back();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1b1530]/70 p-4"
    >
      <div className="relative max-h-[85vh] w-full max-w-[720px] overflow-y-auto bg-[#fff5e4] p-6 text-[#1b1530] shadow-2xl sm:p-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center text-[#1b1530]/50 transition-colors hover:text-[#1b1530]"
        >
          <FaTimes size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
