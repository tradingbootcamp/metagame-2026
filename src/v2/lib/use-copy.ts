"use client";

import { useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

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
