import type { ComponentProps } from "react";
import { VOLUNTEER_APPLY_PATH } from "@/v2/lib/links";

/**
 * Link to the volunteer application. The visitor's stored UTMs travel with
 * the application itself when it's sent, so the link stays plain.
 */
export default function VolunteerFormLink(
  props: Omit<ComponentProps<"a">, "href" | "target" | "rel">,
) {
  return <a {...props} href={VOLUNTEER_APPLY_PATH} />;
}
