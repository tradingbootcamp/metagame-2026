"use client";

import { useState } from "react";
import InterestFollowup from "./InterestFollowup";

type Status = "idle" | "submitting" | "success" | "error";

const FIELD =
  "h-12 border-[1.5px] border-[#1b1530]/35 bg-[#f4ecd2] px-4 text-base text-[#1b1530] outline-none transition-colors placeholder:text-[#1b1530]/40 focus:border-[#2b9bf0]";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Remembered after success so the interest follow-up can patch the same row.
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

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
        <p className="text-center text-base text-[#1b1530]">
          Thanks — you&apos;re on the list. We&apos;ll be in touch.
        </p>
        <InterestFollowup email={submittedEmail} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          aria-label="Name (optional)"
          autoComplete="name"
          className={`${FIELD} w-full`}
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com*"
          aria-label="Email address"
          autoComplete="email"
          className={`${FIELD} w-full sm:w-auto sm:flex-1`}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="group relative disabled:opacity-60"
        >
          {/* blue box behind the button, revealed on hover */}
          <span aria-hidden className="absolute inset-0 bg-[#2b9bf0]" />
          <span className="relative flex h-12 items-center justify-center bg-[#1b1530] px-7 font-[family-name:var(--font-bebas)] text-xl leading-[20px] tracking-[0.08em] text-[#f4ecd2] transition-transform group-hover:-translate-x-[5px] group-hover:-translate-y-[5px] group-disabled:translate-x-0! group-disabled:translate-y-0!">
            {status === "submitting" ? "…" : "Notify me"}
          </span>
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-[#c0392b]">
          Something went wrong. Try again.
        </p>
      )}
    </form>
  );
}
