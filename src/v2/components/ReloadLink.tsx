"use client";

import type { ComponentProps } from "react";

// In-page anchor that reloads the page at its target instead of just scrolling.
export default function ReloadLink({
  href,
  ...props
}: ComponentProps<"a"> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        history.scrollRestoration = "manual";
        window.location.hash = href;
        window.location.reload();
      }}
      {...props}
    />
  );
}
