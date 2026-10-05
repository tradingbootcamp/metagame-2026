"use client";

import type { ComponentProps } from "react";
import { withFirstTouchUtm } from "@/lib/utm";
import { VOLUNTEER_FORM_PATH } from "@/v2/lib/links";

/** New-tab link to the volunteer form that carries the visitor's first-touch UTMs. */
export default function VolunteerFormLink(
  props: Omit<ComponentProps<"a">, "href" | "target" | "rel" | "onClick">,
) {
  return (
    <a
      {...props}
      href={VOLUNTEER_FORM_PATH}
      target="_blank"
      rel="noopener noreferrer"
      // Added at click time: UTMs live in localStorage, and the server-rendered href must stay stable.
      onClick={(e) => {
        e.currentTarget.href = withFirstTouchUtm(VOLUNTEER_FORM_PATH);
      }}
    />
  );
}
