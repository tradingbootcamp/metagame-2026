"use client";

import { useState } from "react";
import { Button } from "@/v2/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import { Input } from "@/v2/components/ui/input";
import { TEAM_EMAIL } from "@/v2/lib/links";
import { cn } from "@/v2/lib/utils";
import { HEADING } from "../styles";
import type { ContactOptions } from "./ContactProvider";

type Status = "idle" | "submitting" | "success" | "error";

// <Input>'s look, on a textarea.
const TEXTAREA =
  "min-h-[140px] w-full resize-y rounded-lg border-[1.5px] border-cream/25 bg-navy2 px-4 py-3 text-base text-cream transition-colors outline-none placeholder:text-cream/40 focus:border-tan disabled:opacity-60";

export default function ContactModal({
  subject: initialSubject = "",
  to = TEAM_EMAIL,
  onClose,
}: ContactOptions & { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, website, to }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-w-[560px] flex-col gap-5 px-9 py-8">
        <div>
          <DialogTitle
            className={`${HEADING} text-[clamp(22px,3vw,28px)] text-cream`}
          >
            Contact us
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] text-cream/80">
            {to === TEAM_EMAIL
              ? "Questions, ticket transfers, accessibility, anything else — we'll reply by email."
              : `Your message goes to ${to}. We'll reply by email.`}
          </DialogDescription>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-base text-cream/90">
              Thanks — your message is on its way. We&apos;ll get back to you at{" "}
              <span className="font-semibold text-cream">{email}</span>.
            </p>
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="@container flex flex-col gap-3"
          >
            <div className="flex flex-col gap-3 @md:flex-row">
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name*"
                aria-label="Name"
                autoComplete="name"
                className="min-w-0 @md:flex-1"
              />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com*"
                aria-label="Email address"
                autoComplete="email"
                className="min-w-0 @md:flex-1"
              />
            </div>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              aria-label="Subject"
            />
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message*"
              aria-label="Message"
              className={TEXTAREA}
            />
            {/* Honeypot — hidden from people, filled by bots. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="h-12 px-7 text-base"
              >
                {status === "submitting" ? "Sending…" : "Send message"}
              </Button>
              <p
                className={cn(
                  "text-sm text-salmon",
                  status !== "error" && "hidden",
                )}
              >
                Something went wrong. Try again, or email {TEAM_EMAIL}.
              </p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
