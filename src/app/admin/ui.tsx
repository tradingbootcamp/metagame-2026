"use client";

import { useState } from "react";

export const fieldClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-navy";
// Native selects ignore padding on the arrow side; draw our own chevron so it sits inside.
export const selectClass = `${fieldClass.replace("w-full ", "")} max-w-full appearance-none bg-no-repeat pr-9`;
export const selectStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23333' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.6rem center",
};
export const buttonClass =
  "w-full rounded-lg bg-meeple px-4 py-2.5 font-roboto font-semibold text-white transition-colors hover:bg-meeple-dark disabled:opacity-60";
export const smallButtonClass =
  "rounded-md border border-line bg-white px-2.5 py-1 text-sm text-ink/80 transition-colors hover:border-navy hover:text-navy disabled:opacity-60";

export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
      <h1 className="font-bebas mb-4 text-2xl tracking-wide text-navy">
        {title}
      </h1>
      {children}
    </div>
  );
}

type CopyStatus = "idle" | "copied" | "failed";

export function useCopy() {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };
  return { status, copy };
}
