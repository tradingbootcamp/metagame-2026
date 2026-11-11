"use client";

import { useEffect, useState } from "react";
import { Button } from "@/v2/components/ui/button";
import { Input } from "@/v2/components/ui/input";
import { cn } from "@/v2/lib/utils";
import InterestFollowup from "./InterestFollowup";
import { FIELD_LIGHT } from "../styles";

type Status = "idle" | "submitting" | "success" | "error";

// `compact` is the hero's version: name on its own row, then email and button.
export default function SignupForm({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  // <Input> is dark by default; the `light` cream-section variant overrides it.
  // min-w-0 lets the fields shrink in the row; the row itself is a container
  // query (see the form) so it stacks in a narrow modal and only goes side-by-
  // side when its own width allows — not based on the viewport.
  const field = cn(
    light && FIELD_LIGHT,
    "min-w-0",
    compact ? "h-11 flex-1 px-3" : "@lg:w-auto @lg:flex-1",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Remembered after success so the interest follow-up can patch the same row.
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Prefill from ?name=…&email=… so external links (e.g. the ticket-confirmation
  // email) can land on a filled form. Prefill only, never auto-submit — link
  // scanners follow GETs. Deferred: lint forbids synchronous setState in effects.
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const name = params.get("name");
      const email = params.get("email");
      if (name) setName((v) => v || name);
      if (email) setEmail((v) => v || email);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmittedEmail(email);
      setStatus("success");
      setName("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p
          className={cn(
            "text-center",
            // Compact: scales down so the line fits a phone-width hero card.
            compact ? "text-[length:min(0.875rem,3.9vw_-_2.5px)]" : "text-base",
            light ? "text-ink/80" : "text-cream/90",
          )}
        >
          Thanks — you&apos;re on the list. We&apos;ll be in touch.
        </p>
        <InterestFollowup email={submittedEmail} light={light} />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="@container flex w-full flex-col gap-3"
    >
      <div
        className={cn(
          "flex",
          compact ? "flex-wrap gap-2" : "flex-col gap-3 @lg:flex-row",
        )}
      >
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          aria-label="Name"
          autoComplete="name"
          className={cn(field, compact && "flex-none")}
        />
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com*"
          aria-label="Email address"
          autoComplete="email"
          className={field}
        />
        <Button
          type="submit"
          disabled={status === "submitting"}
          className={compact ? "h-11 px-4 text-sm" : "h-12 px-7 text-base"}
        >
          {status === "submitting" ? "…" : "Notify me"}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-sm text-salmon">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
