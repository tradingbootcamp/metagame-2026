"use client";

import AccountPicker, { type Assignee } from "./AccountPicker";

export type Shepherd = Assignee;

/** The /grade overview's Shepherd pill; the committee board uses AccountPicker directly. */
export default function ShepherdPicker(props: {
  sessionId: string;
  value: Shepherd | null;
}) {
  return <AccountPicker field="shepherd" {...props} />;
}
