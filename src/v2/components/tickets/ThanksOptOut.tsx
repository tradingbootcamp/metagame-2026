"use client";

import { useState } from "react";
import { Button } from "@/v2/components/ui/button";

type Status = "idle" | "submitting" | "success" | "error";

export default function ThanksOptOut({
  sessionId,
  email,
}: {
  sessionId: string;
  email: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function optOut() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/mailing-list/opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-base text-ink">
        Done &mdash; {email} is off the mailing list. You&apos;ll still get
        emails about your ticket.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-base text-ink">
        We also added {email} to the Metagame mailing list for news about this
        and future events.
      </p>
      <Button
        type="button"
        variant="navy"
        onClick={optOut}
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "…" : "Opt out of the mailing list"}
      </Button>
      {status === "error" && (
        <p className="text-sm text-meeple">Something went wrong. Try again.</p>
      )}
    </div>
  );
}
